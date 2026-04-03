import { z } from 'zod';

export const placeBidSchema = z.object({
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Částka musí být kladné číslo",
  }),
});
