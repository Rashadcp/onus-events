import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import BillingDocument, { BillingCopyType, BillingDocumentType } from '../../models/BillingDocument';
import Event from '../../models/Event';
import { calculateBilling } from '../../services/pricingEngine';
import { generateBillingPdf } from '../../services/pdfService';

const lineItemSchema = z.object({
  itemId: z.string().optional(),
  itemCode: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().min(1),
  rentalDays: z.number().min(1).optional(),
  unitRate: z.number().min(0).optional(),
  discountType: z.enum(['PERCENTAGE', 'FLAT']).optional(),
  discountValue: z.number().min(0).optional(),
  gstRate: z.number().min(0).optional()
});

const documentSchema = z.object({
  documentType: z.enum(['QUOTATION', 'INVOICE']).default('QUOTATION'),
  eventId: z.string().optional(),
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    gstin: z.string().optional(),
    billingAddress: z.string().optional(),
    eventPlace: z.string().optional()
  }),
  event: z.object({
    program: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  }).optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1)
});

function getUserObjectId(req: Request) {
  const userId = req.user?.userId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Authenticated user id is missing from token.');
  }
  return new mongoose.Types.ObjectId(userId);
}

async function nextDocumentNumber(type: BillingDocumentType) {
  const prefix = type === 'QUOTATION' ? 'QT' : 'INV';
  const financialYear = new Date().getFullYear();
  const count = await BillingDocument.countDocuments({
    documentType: type,
    createdAt: {
      $gte: new Date(`${financialYear}-01-01T00:00:00.000Z`),
      $lt: new Date(`${financialYear + 1}-01-01T00:00:00.000Z`)
    }
  });
  return `${prefix}-${financialYear}-${String(count + 1).padStart(4, '0')}`;
}

export async function priceBillingDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = z.object({ lineItems: z.array(lineItemSchema).min(1) }).parse(req.body);
    const pricing = await calculateBilling(parsed.lineItems);
    res.status(200).json(pricing);
  } catch (error) {
    next(error);
  }
}

export async function createBillingDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = documentSchema.parse(req.body);
    const pricing = await calculateBilling(parsed.lineItems);
    const documentNumber = await nextDocumentNumber(parsed.documentType);

    const document = await BillingDocument.create({
      ...parsed,
      event: {
        program: parsed.event?.program,
        startDate: parsed.event?.startDate ? new Date(parsed.event.startDate) : undefined,
        endDate: parsed.event?.endDate ? new Date(parsed.event.endDate) : undefined
      },
      issueDate: parsed.issueDate ? new Date(parsed.issueDate) : new Date(),
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
      documentNumber,
      lineItems: pricing.lineItems,
      totals: pricing.totals,
      createdBy: getUserObjectId(req)
    });

    if (parsed.eventId && parsed.documentType === 'QUOTATION') {
      await Event.findByIdAndUpdate(parsed.eventId, { eventStatus: 'QUOTATION' });
    }

    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
}

export async function getBillingDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.type) filter.documentType = req.query.type;
    if (req.query.eventId) filter.eventId = req.query.eventId;

    const documents = await BillingDocument.find(filter)
      .populate('eventId')
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json(documents);
  } catch (error) {
    next(error);
  }
}

export async function getBillingDocumentById(req: Request, res: Response, next: NextFunction) {
  try {
    const document = await BillingDocument.findById(req.params.id)
      .populate('eventId')
      .populate('createdBy', 'name email role');

    if (!document) {
      return res.status(404).json({ error: 'Billing document not found.' });
    }

    res.status(200).json(document);
  } catch (error) {
    next(error);
  }
}

export async function convertQuotationToInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const quotation = await BillingDocument.findById(req.params.id);
    if (!quotation || quotation.documentType !== 'QUOTATION') {
      return res.status(404).json({ error: 'Quotation not found.' });
    }

    const invoice = await BillingDocument.create({
      documentType: 'INVOICE',
      documentNumber: await nextDocumentNumber('INVOICE'),
      sourceQuotation: quotation._id,
      eventId: quotation.eventId,
      customer: quotation.customer,
      event: quotation.event,
      issueDate: new Date(),
      dueDate: req.body?.dueDate ? new Date(req.body.dueDate) : undefined,
      status: 'DRAFT',
      notes: req.body?.notes || quotation.notes,
      terms: quotation.terms,
      lineItems: quotation.lineItems,
      totals: quotation.totals,
      createdBy: getUserObjectId(req)
    });

    quotation.status = 'CONVERTED';
    await quotation.save();

    if (quotation.eventId) {
      await Event.findByIdAndUpdate(quotation.eventId, { eventStatus: 'APPROVED' });
    }

    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
}

export async function downloadBillingPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const document = await BillingDocument.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Billing document not found.' });
    }

    const copyType = (req.query.copyType as BillingCopyType) || 'CUSTOMER_COPY';
    const pdf = generateBillingPdf(document, copyType);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.documentNumber}-${copyType}.pdf"`);
    res.status(200).send(pdf);
  } catch (error) {
    next(error);
  }
}
