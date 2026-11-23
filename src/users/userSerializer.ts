import type { UserRecord } from './userRepository.js';

export interface PublicUserDto {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
  banner: string | null;
  accent_color: number | null;
  bot: boolean;
  system: boolean;
  public_flags: number;
}

export interface SelfUserDto extends PublicUserDto {
  mfa_enabled: boolean;
  verified: boolean;
  email: string;
  bio: string;
  flags: number;
  premium_type: number;
  nsfw_allowed: boolean;
}

export function serializePublicUser(user: UserRecord): PublicUserDto {
  return {
    id: user.id,
    username: user.username,
    discriminator: '0',
    global_name: user.global_name,
    avatar: user.avatar,
    banner: user.banner,
    accent_color: user.accent_color,
    bot: Boolean(user.bot),
    system: false,
    public_flags: 0,
  };
}

export function serializeSelfUser(user: UserRecord): SelfUserDto {
  return {
    ...serializePublicUser(user),
    mfa_enabled: false,
    verified: Boolean(user.verified),
    email: user.email,
    bio: user.bio ?? '',
    flags: 0,
    premium_type: 0,
    nsfw_allowed: true,
  };
}
