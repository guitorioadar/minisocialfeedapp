import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma';
import { hashPassword, comparePassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';
import { env } from '../../config/env';

const FIXED_OTP = '123456';

interface SignupInput {
  username: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
  };
  token: string;
}

export const signup = async ({
  username,
  email,
  password,
}: SignupInput): Promise<AuthResponse> => {
  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new Error('Email already registered');
    }
    if (existingUser.username === username) {
      throw new Error('Username already taken');
    }
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
    },
    select: {
      id: true,
      username: true,
      email: true,
    },
  });

  const token = signToken({
    userId: user.id,
    email: user.email,
  });

  return { user, token };
};

export const login = async ({
  email,
  password,
}: LoginInput): Promise<AuthResponse> => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValidPassword = await comparePassword(password, user.password);

  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    token,
  };
};

export const logout = async (userId: string): Promise<void> => {
  await prisma.fcmToken.deleteMany({
    where: { userId },
  });
};

export const forgotPassword = async (email: string): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('No account found with this email');
  }
  // In production, send OTP via email here.
  // For now, the fixed OTP is 123456.
};

export const verifyOtp = async (
  email: string,
  otp: string
): Promise<{ resetToken: string }> => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('No account found with this email');
  }

  if (otp !== FIXED_OTP) {
    throw new Error('Invalid OTP');
  }

  // Generate a short-lived reset token (15 minutes)
  const resetToken = jwt.sign(
    { userId: user.id, email: user.email, type: 'password-reset' },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  return { resetToken };
};

export const resetPassword = async (
  resetToken: string,
  newPassword: string
): Promise<void> => {
  let payload: any;
  try {
    payload = jwt.verify(resetToken, env.JWT_SECRET);
  } catch {
    throw new Error('Invalid or expired reset token');
  }

  if (payload.type !== 'password-reset') {
    throw new Error('Invalid reset token');
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: payload.userId },
    data: { password: hashedPassword },
  });
};
