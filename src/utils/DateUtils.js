import { IntlDateTimeFormat } from 'intl'; // In case it's needed for old environments, but usually standard in RN now

export const formatDateTime = (dateString, showTime = true) => {
    if (!dateString) return '';

    // Step 1: Remove "Z" and "T" to prevent JS from converting to local timezone offsets
    // This ensures that "11:00:00" in DB stays "11:00:00" in App.
    let cleanDate = typeof dateString === 'string'
        ? dateString.replace('Z', '').replace('T', ' ')
        : dateString;

    const date = new Date(cleanDate);

    if (isNaN(date.getTime())) return dateString;

    const day = String(date.getDate()).padStart(2, '0');
    // We use short month names like 'mar'
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
    const month = monthFormatter.format(date).toLowerCase();
    const year = date.getFullYear();

    if (!showTime) {
        return `${day}-${month}-${year}`;
    }

    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strHours = String(hours).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}-${month}-${year}, ${strHours}:${minutes} ${ampm}`;
};
