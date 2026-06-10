import bcrypt from 'bcrypt';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import {
  ChangePasswordResult,
  LoginResult,
} from '../../domain/types/auth.types';
import { UserProfile } from '../../domain/types/user.types';
import { buildAccessTokenClaims, signAccessToken } from '../../infrastructure/auth/jwt';
import { AuthConfig } from '../../shared/constants/authConfig';
import { AuthMessages } from '../../shared/constants/authMessages';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';
import { AppError } from '../../shared/errors/AppError';
import { formatValidationViolations } from '../../shared/utils/validation.utils';
import { validatePasswordStrength } from '../validators/password.validator';

export interface LoginInput {
  username: string;
  password: string;
}

export interface ChangePasswordInput {
  userId: number;
  newPassword: string;
  confirmPassword: string;
}

export class AuthService {
  constructor(private readonly userRepository: IUserRepository) {}

  async login(input: LoginInput): Promise<LoginResult> {
    const user = await this.userRepository.findByUsername(input.username);

    if (!user) {
      throw this.invalidCredentialsError();
    }

    if (!user.isActive) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        AuthMessages.ACCOUNT_DEACTIVATED,
        ErrorTitles.FORBIDDEN,
      );
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw this.invalidCredentialsError();
    }

    return this.buildAuthResponse(this.toUserProfile(user));
  }

  async changePassword(input: ChangePasswordInput): Promise<ChangePasswordResult> {
    if (input.newPassword !== input.confirmPassword) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        AuthMessages.PASSWORDS_DO_NOT_MATCH,
        ErrorTitles.BAD_REQUEST,
      );
    }

    const passwordViolations = validatePasswordStrength(input.newPassword);

    if (passwordViolations.length > 0) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        formatValidationViolations(passwordViolations),
        ErrorTitles.BAD_REQUEST,
      );
    }

    const passwordHash = await bcrypt.hash(input.newPassword, AuthConfig.BCRYPT_SALT_ROUNDS);

    const updatedUser = await this.userRepository.updatePassword({
      userId: input.userId,
      passwordHash,
      forcePasswordChange: false,
    });

    const authResponse = this.buildAuthResponse(updatedUser);

    return {
      message: AuthMessages.PASSWORD_UPDATED,
      token: authResponse.token,
      user: authResponse.user,
    };
  }

  async getProfile(userId: number): Promise<UserProfile> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        AuthMessages.USER_NOT_FOUND,
        ErrorTitles.NOT_FOUND,
      );
    }

    return this.toUserProfile(user);
  }

  private buildAuthResponse(user: UserProfile): LoginResult {
    const token = signAccessToken(buildAccessTokenClaims(user));
    return { token, user };
  }

  private toUserProfile(user: {
    id: number;
    username: string;
    email: string;
    fullName: string;
    role: UserProfile['role'];
    forcePasswordChange: boolean;
  }): UserProfile {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      forcePasswordChange: user.forcePasswordChange,
    };
  }

  private invalidCredentialsError(): AppError {
    return new AppError(
      HttpStatus.UNAUTHORIZED,
      AuthMessages.INVALID_CREDENTIALS,
      ErrorTitles.UNAUTHORIZED,
    );
  }
}
