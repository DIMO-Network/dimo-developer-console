import { TeamRoles } from '@/types/team';

export const isOwner = (role: string): boolean => role === TeamRoles.OWNER;

export const isCollaborator = (role: string): boolean => role === TeamRoles.COLLABORATOR;

export const getInitials = (fullName: string): string => {
  const nameParts = fullName.split(' ');
  const filteredNameParts = nameParts.filter((part) => part.length > 0);

  if (filteredNameParts.length >= 2) {
    const firstNameInitial = filteredNameParts[0][0];
    const lastNameInitial = filteredNameParts[filteredNameParts.length - 1][0];

    return firstNameInitial.toUpperCase() + lastNameInitial.toUpperCase();
  } else if (filteredNameParts.length >= 1) {
    const firstNameInitial = filteredNameParts[0][0];
    return firstNameInitial.toUpperCase();
  } else {
    return '';
  }
};

export const shortenAddress = (address: string): string => {
  if (!address || typeof address !== 'string') {
    throw new Error('Invalid address');
  }

  // Check if the address starts with 0x and is 42 characters long
  if (address.length !== 42 || !address.startsWith('0x')) {
    throw new Error('Invalid Ethereum address');
  }

  const start = address.substring(0, 6); // First 6 characters including '0x'
  const end = address.substring(address.length - 4); // Last 4 characters

  return `${start}...${end}`;
};
