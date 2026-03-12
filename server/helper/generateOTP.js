export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const isValidOTP = (otp) => {
    return /^\d{6}$/.test(otp);
};

export const isExpiredOTP = (createdAt, expiryTimeInMinutes = 10) => {
    const now = new Date();
    const createdAtDate = new Date(createdAt);
    const expiryDate = new Date(createdAtDate.getTime() + expiryTimeInMinutes * 60000);
    return now > expiryDate;
};