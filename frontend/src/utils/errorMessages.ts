export const getFarmerFriendlyMessage = (code: string | undefined): string => {
  switch (code) {
    case 'INVALID_FARM':
      return 'Farm information is incomplete. Please check your farm details and try again.';
    case 'FARM_NOT_FOUND':
      return 'We could not find a farm associated with this ID. Please register your farm profile first.';
    case 'FARMER_NOT_FOUND':
      return 'Farmer profile does not exist. Please check your farmer registration.';
    case 'CROP_NOT_FOUND':
      return 'This crop does not exist in our regional registry or has missing reference data.';
    case 'INVALID_INPUT':
      return 'One or more values provided are invalid. Please check your input fields.';
    case 'DATA_UNAVAILABLE':
      return 'This information is not available for your farm yet. Regional datasets are currently updating.';
    case 'NETWORK_ERROR':
      return "We couldn't reach the server. Please check your connection and try again.";
    case 'INTERNAL_ERROR':
      return 'Our system is experiencing difficulties. Please try again in a few minutes.';
    default:
      return 'An unexpected error occurred. Please try again. If this persists, contact our support team.';
  }
};
