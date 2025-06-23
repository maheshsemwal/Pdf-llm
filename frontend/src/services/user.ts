// User service for managing user IDs and cookies

class UserService {
  private static instance: UserService;
  private userId: string | null = null;
  private readonly USER_ID_COOKIE = 'ai_chat_user_id';

  constructor() {
    this.initializeUserId();
  }

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }
  /**
   * Generate a unique user ID
   */
  private generateUserId(): string {
    // Generate a more UUID-like format but still readable
    const timestamp = Date.now().toString(36);
    const random1 = Math.random().toString(36).substring(2, 8);
    const random2 = Math.random().toString(36).substring(2, 8);
    return `user-${timestamp}-${random1}-${random2}`;
  }
  /**
   * Get user ID from cookie or generate a new one
   */
  private initializeUserId(): void {
    const existingUserId = this.getCookie(this.USER_ID_COOKIE);
    
    if (existingUserId) {
      this.userId = existingUserId;
      console.log('Using existing user ID:', existingUserId);
    } else {
      this.userId = this.generateUserId();
      this.setCookie(this.USER_ID_COOKIE, this.userId, 365); // Store for 1 year
      console.log('Generated new user ID:', this.userId);
    }
  }

  /**
   * Get the current user ID
   */
  public getUserId(): string {
    if (!this.userId) {
      this.initializeUserId();
    }
    return this.userId!;
  }
  /**
   * Set a cookie
   */
  private setCookie(name: string, value: string, days: number): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }

  /**
   * Get a cookie value
   */
  private getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    
    return null;
  }

  /**
   * Clear user data (for logout functionality)
   */
  public clearUser(): void {
    this.userId = null;
    document.cookie = `${this.USER_ID_COOKIE}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }

  /**
   * Reset user ID (generate a new one)
   */
  public resetUserId(): string {
    this.userId = this.generateUserId();
    this.setCookie(this.USER_ID_COOKIE, this.userId, 365);
    return this.userId;
  }
}

export const userService = UserService.getInstance();
