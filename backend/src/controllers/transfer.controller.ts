import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as transferService from '../services/transfer.service';

const transferSchema = z.object({
  recipient: z.string().min(1, 'Příjemce je povinný.'),
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Neplatná částka.'),
  note: z.string().max(100).optional(),
});

export async function transfer(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = transferSchema.parse(req.body);
    const result = await transferService.transferST(
      req.user!.userId,
      validated.recipient,
      validated.amount,
      validated.note
    );
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    next(error);
  }
}
