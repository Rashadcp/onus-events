import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Event from '../../models/Event';

/**
 * Fetch billing totals for a Sales Representative for a specific month (For Incentive Calculations).
 */
export async function getRepresentativeBilling(req: Request, res: Response) {
  try {
    const { repId } = req.params;
    const { month, year } = req.query; // Expect formats: month ("1"-"12"), year ("2026")

    if (!month || !year) {
      return res.status(400).json({ error: 'month and year parameters are required.' });
    }

    const start = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const end = new Date(parseInt(year as string), parseInt(month as string), 1);

    // Fetch confirmed events created by the rep in this date window
    const events = await Event.find({
      createdBy: new mongoose.Types.ObjectId(repId),
      isDeleted: false,
      'eventDate.start': { $gte: start, $lt: end }
    }).populate('items.itemId');

    let totalBillingAmount = 0;
    const detailedBillingList: any[] = [];

    // Calculate billing totals by looking only at items from CONFIRMED departments
    for (const event of events) {
      let eventBilling = 0;
      const confirmedDepartments: string[] = [];

      // Identify confirmed departments
      Object.entries(event.confirmations).forEach(([dept, conf]: any) => {
        if (conf && conf.confirmed) {
          confirmedDepartments.push(dept);
        }
      });

      // Filter and price items in confirmed departments
      for (const itemRef of event.items) {
        const item: any = itemRef.itemId;
        if (item && confirmedDepartments.includes(item.department)) {
          // Multiply item quantity by rentalRate or saleRate
          const rate = item.rentalRate || item.saleRate || 0;
          const billingCost = itemRef.quantity * rate;
          eventBilling += billingCost;
        }
      }

      totalBillingAmount += eventBilling;
      detailedBillingList.push({
        eventId: event._id,
        customerName: event.customerName,
        place: event.place,
        eventDate: event.eventDate.start,
        confirmedDepartments,
        billingAmount: eventBilling
      });
    }

    return res.status(200).json({
      representativeId: repId,
      period: `${month}/${year}`,
      totalBillingAmount,
      eventsCount: events.length,
      detailedBillingList
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}

/**
 * Fetch assigned event schedule for a Site Incharge / Captain (Selected Sites Only).
 */
export async function getCaptainSchedule(req: Request, res: Response) {
  try {
    const { captainId } = req.params;

    // Fetch active events where assignedCaptain matches captainId
    const events = await Event.find({
      assignedCaptain: new mongoose.Types.ObjectId(captainId),
      isDeleted: false
    })
      .populate('items.itemId')
      .sort({ 'eventDate.start': 1 });

    const formattedSchedule = events.map((event) => {
      // Group items by department for the captain's layout
      const itemsByDepartment: any = {};
      event.items.forEach((itemRef: any) => {
        const item = itemRef.itemId;
        if (item) {
          if (!itemsByDepartment[item.department]) {
            itemsByDepartment[item.department] = [];
          }
          itemsByDepartment[item.department].push({
            itemCode: item.itemCode,
            name: item.name,
            quantity: itemRef.quantity
          });
        }
      });

      return {
        eventId: event._id,
        customerName: event.customerName,
        eventDate: event.eventDate,
        timeWindow: event.timeWindow,
        place: event.place,
        program: event.program,
        itemsByDepartment
      };
    });

    return res.status(200).json({
      captainId,
      schedule: formattedSchedule
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error: ' + error.message });
  }
}
