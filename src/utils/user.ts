export const getInitials = (fullName: string): string => {
  const nameParts = fullName.split(' ');
  const filteredNameParts = nameParts.filter((part) => part.length > 0);

  if (filteredNameParts.length >= 2) {
    const firstNameInitial = filteredNameParts[0][0];
    const lastNameInitial = filteredNameParts[filteredNameParts.length - 1][0];

    return firstNameInitial.toUpperCase() + lastNameInitial.toUpperCase();
  } else {
    return '';
  }
};
