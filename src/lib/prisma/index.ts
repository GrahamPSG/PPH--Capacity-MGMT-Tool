// Re-export prisma client for consistent imports
export { default as prisma } from './client';
export { connect, disconnect } from './client';

// Also export as default for backward compatibility
import prismaClient from './client';
export default prismaClient;