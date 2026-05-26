import Item from '../models/Item';
import { DiscountType, IBillingLineItem, IBillingTotals } from '../models/BillingDocument';

export interface PricingInputLine {
  itemId?: string;
  itemCode?: string;
  description?: string;
  quantity: number;
  rentalDays?: number;
  unitRate?: number;
  discountType?: DiscountType;
  discountValue?: number;
  gstRate?: number;
}

export interface PricingResult {
  lineItems: IBillingLineItem[];
  totals: IBillingTotals;
}

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function calculateDiscount(baseAmount: number, discountType: DiscountType, discountValue: number) {
  if (discountType === 'PERCENTAGE') {
    return Math.min(baseAmount, baseAmount * (discountValue / 100));
  }
  return Math.min(baseAmount, discountValue);
}

export async function calculateBilling(inputLines: PricingInputLine[]): Promise<PricingResult> {
  if (!inputLines.length) {
    throw new Error('At least one billing line item is required.');
  }

  const lineItems: IBillingLineItem[] = [];

  for (const input of inputLines) {
    const quantity = Number(input.quantity || 0);
    const rentalDays = Number(input.rentalDays || 1);

    if (quantity < 1 || rentalDays < 1) {
      throw new Error('Quantity and rental days must be at least 1.');
    }

    const item = input.itemId
      ? await Item.findById(input.itemId)
      : input.itemCode
        ? await Item.findOne({ itemCode: input.itemCode.toUpperCase(), isActive: true })
        : null;

    const unitRate = Number(input.unitRate ?? item?.rentalRate ?? 0);
    if (unitRate < 0) {
      throw new Error('Unit rate cannot be negative.');
    }

    const discountType = input.discountType || 'FLAT';
    const discountValue = Number(input.discountValue || 0);
    const gstRate = Number(input.gstRate ?? 18);
    const subTotal = quantity * rentalDays * unitRate;
    const discountAmount = calculateDiscount(subTotal, discountType, discountValue);
    const taxableAmount = roundCurrency(subTotal - discountAmount);
    const gstAmount = roundCurrency(taxableAmount * (gstRate / 100));

    lineItems.push({
      itemId: item?._id,
      itemCode: (input.itemCode || item?.itemCode || 'CUSTOM').toUpperCase(),
      description: input.description || item?.name || 'Custom rental charge',
      quantity,
      rentalDays,
      unitRate: roundCurrency(unitRate),
      discountType,
      discountValue,
      gstRate,
      taxableAmount,
      gstAmount,
      totalAmount: roundCurrency(taxableAmount + gstAmount)
    } as IBillingLineItem);
  }

  const totals = lineItems.reduce(
    (acc, item) => {
      const lineSubTotal = item.quantity * item.rentalDays * item.unitRate;
      acc.subTotal += lineSubTotal;
      acc.taxableTotal += item.taxableAmount;
      acc.gstTotal += item.gstAmount;
      acc.grandTotal += item.totalAmount;
      acc.discountTotal += lineSubTotal - item.taxableAmount;
      return acc;
    },
    { subTotal: 0, discountTotal: 0, taxableTotal: 0, gstTotal: 0, grandTotal: 0 }
  );

  return {
    lineItems,
    totals: {
      subTotal: roundCurrency(totals.subTotal),
      discountTotal: roundCurrency(totals.discountTotal),
      taxableTotal: roundCurrency(totals.taxableTotal),
      gstTotal: roundCurrency(totals.gstTotal),
      grandTotal: roundCurrency(totals.grandTotal)
    }
  };
}
