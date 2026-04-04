import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import * as passCodeService from '../services/passcode.service';
import { env } from '../config/env';

const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Uživatelské jméno smí obsahovat pouze písmena, čísla a podtržítka.'),
  password: z.string().min(8, 'Heslo musí mít alespoň 8 znaků.'),
  passCode: z.string().min(1, 'Přístupový kód je povinný.'),
  ref: z.string().optional(),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

function setCookies(res: Response, tokens: authService.AuthTokens, rememberMe: boolean = false) {
  const isProduction = env.nodeEnv === 'production';
  
  // Access token is always short-lived
  res.cookie('access_token', tokens.accessToken, {
    httpOnly: true, 
    secure: isProduction, 
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, 
    path: '/',
  });

  // Refresh token duration depends on rememberMe
  const refreshTokenMaxAge = rememberMe 
    ? 30 * 24 * 60 * 60 * 1000 // 30 days
    : 24 * 60 * 60 * 1000;      // 24 hours (fallback)

  res.cookie('refresh_token', tokens.refreshToken, {
    httpOnly: true, 
    secure: isProduction, 
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: refreshTokenMaxAge, 
    path: '/',
  });
}



export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = registerSchema.parse(req.body);
    // 1. Validate pass code (throws 401 if wrong)
    await passCodeService.validatePassCode(validated.passCode);
    // 2. Register user
    const { user, tokens } = await authService.registerUser(validated);
    // 3. Rotate code — single-use (only after successful auth)
    await passCodeService.rotateCodeAfterUse(user.id, user.username);
    setCookies(res, tokens);
    res.status(201).json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = loginSchema.parse(req.body);
    const { user, tokens } = await authService.loginUser(validated);
    setCookies(res, tokens, validated.rememberMe);
    res.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Neplatné přihlašovací údaje.' });
      return;
    }
    next(error);
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
  res.json({ message: 'Odhlášení úspěšné.' });
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getCurrentUser(req.user!.userId);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      res.status(401).json({ error: 'Chybí refresh token.' });
      return;
    }
    const tokens = await authService.refreshTokens(refreshToken);
    setCookies(res, tokens);
    res.json({ message: 'Tokeny obnoveny.' });
  } catch (error) {
    next(error);
  }
}
