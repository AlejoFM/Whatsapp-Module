export class TimeUtils {
  /**
   * Formatea una fecha para mostrar tiempo relativo
   */
  static formatRelativeTime(date: Date | string | null | undefined): string {
    if (!date) return '';
    
    const targetDate = new Date(date);
    const now = new Date();
    const diffInMs = now.getTime() - targetDate.getTime();
    const diffInMinutes = diffInMs / (1000 * 60);
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;

    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m`;
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h`;
    if (diffInDays < 7) return `${Math.floor(diffInDays)}d`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}sem`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)}mes`;
    
    return `${Math.floor(diffInDays / 365)}año`;
  }

  /**
   * Formatea una fecha para mostrar hora
   */
  static formatTime(date: Date | string | null | undefined): string {
    if (!date) return '';
    
    const targetDate = new Date(date);
    return targetDate.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Formatea una fecha para mostrar fecha completa
   */
  static formatDate(date: Date | string | null | undefined): string {
    if (!date) return '';
    
    const targetDate = new Date(date);
    return targetDate.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Formatea una fecha para mostrar fecha y hora
   */
  static formatDateTime(date: Date | string | null | undefined): string {
    if (!date) return '';
    
    const targetDate = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - targetDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return this.formatTime(date);
    } else {
      return this.formatDate(date);
    }
  }

  /**
   * Verifica si una fecha es de hoy
   */
  static isToday(date: Date | string | null | undefined): boolean {
    if (!date) return false;
    
    const targetDate = new Date(date);
    const now = new Date();
    
    return targetDate.toDateString() === now.toDateString();
  }

  /**
   * Verifica si una fecha es de ayer
   */
  static isYesterday(date: Date | string | null | undefined): boolean {
    if (!date) return false;
    
    const targetDate = new Date(date);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    return targetDate.toDateString() === yesterday.toDateString();
  }

  /**
   * Obtiene el inicio del día para una fecha
   */
  static getStartOfDay(date: Date): Date {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay;
  }

  /**
   * Obtiene el fin del día para una fecha
   */
  static getEndOfDay(date: Date): Date {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  }
}
