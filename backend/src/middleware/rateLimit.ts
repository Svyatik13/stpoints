import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Příliš mnoho požadavků. Zkuste to za chvíli.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Příliš mnoho pokusů o přihlášení. Zkuste to za 15 minut.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const miningLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Příliš mnoho těžebních požadavků. Zpomalte.' },
  standardHeaders: true,
  legacyHeaders: false,
});
