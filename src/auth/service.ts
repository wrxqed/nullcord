import { DiscordApiError } from '../common/errors.js';
import { generateSnowflake } from '../common/snowflake.js';
import {
  createUser,
  findUserByEmail,
  findUserByUsername,
} from '../users/userRepository.js';
import { hashPassword, verifyPassword } from './password.js';
import { generateToken } from './token.js';

export interface RegisterInput {
  email?: unknown;
  username?: unknown;
  global_name?: unknown;
  password?: unknown;
  date_of_birth?: unknown;
}

export interface LoginInput {
  login?: unknown;
  password?: unknown;
}

export interface LoginResult {
  user_id: string;
  token: string;
  user_settings: {
    locale: string;
    theme: string;
  };
}

function createFieldError(field: string, code: string, message: string): DiscordApiError {
  return new DiscordApiError(400, 50035, 'Invalid Form Body', {
    [field]: {
      _errors: [{ code, message }],
    },
  });
}

function createInvalidLoginError(): DiscordApiError {
  return new DiscordApiError(400, 50035, 'Invalid Form Body', {
    login: {
      _errors: [{ code: 'INVALID_LOGIN', message: 'Login or password is invalid.' }],
    },
    password: {
      _errors: [{ code: 'INVALID_LOGIN', message: 'Login or password is invalid.' }],
    },
  });
}

export function registerUser(input: RegisterInput): { token: string } {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const username = typeof input.username === 'string' ? input.username.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const globalName =
    typeof input.global_name === 'string' && input.global_name.trim().length > 0
      ? input.global_name.trim()
      : null;
  const dateOfBirth = typeof input.date_of_birth === 'string' ? input.date_of_birth : null;

  if (!email.includes('@')) {
    throw createFieldError('email', 'EMAIL_TYPE_INVALID_EMAIL', 'Not a well formed email address.');
  }

  if (username.length < 2 || username.length > 32) {
    throw createFieldError('username', 'BASE_TYPE_BAD_LENGTH', 'Must be between 2 and 32 in length.');
  }

  if (password.length < 6) {
    throw createFieldError('password', 'BASE_TYPE_BAD_LENGTH', 'Must be at least 6 characters.');
  }

  if (findUserByEmail(email) !== null) {
    throw createFieldError('email', 'EMAIL_ALREADY_REGISTERED', 'Email is already registered.');
  }

  if (findUserByUsername(username) !== null) {
    throw createFieldError('username', 'USERNAME_ALREADY_TAKEN', 'Username is already taken.');
  }

  const user = createUser({
    id: generateSnowflake(),
    email,
    username,
    globalName,
    passwordHash: hashPassword(password),
    dateOfBirth,
    createdAt: Date.now(),
  });

  return {
    token: generateToken(user.id),
  };
}

export function loginUser(input: LoginInput): LoginResult {
  const login = typeof input.login === 'string' ? input.login.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';

  if (login.length === 0 || password.length === 0) {
    throw createInvalidLoginError();
  }

  const user = findUserByEmail(login);
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw createInvalidLoginError();
  }

  return {
    user_id: user.id,
    token: generateToken(user.id),
    user_settings: {
      locale: user.locale,
      theme: user.theme,
    },
  };
}
