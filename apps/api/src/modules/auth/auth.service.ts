import type { LoginInput, UserDto } from "@dockslot/shared";
import bcrypt from "bcryptjs";
import { unauthenticated } from "../../lib/errors";
import { toUserDto } from "../../lib/mappers";
import { usersRepository } from "./auth.repository";
import { signToken } from "./auth.token";

export async function login(input: LoginInput): Promise<{ user: UserDto; token: string }> {
  const user = await usersRepository.findByEmail(input.email);
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw unauthenticated("Email ou mot de passe incorrect.");
  }
  return { user: toUserDto(user), token: signToken(user) };
}

export async function getProfile(userId: string): Promise<UserDto> {
  const user = await usersRepository.findById(userId);
  if (!user) throw unauthenticated();
  return toUserDto(user);
}
