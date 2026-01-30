import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import dotenv from 'dotenv';
import { parseISO, isAfter, isBefore, format, startOfDay } from 'date-fns';
dotenv.config();

interface ScheduleSlot {
  date: string;
  time: string;
  customerName: string;
  contactInfo: string;
  rowIndex: number;
}

export async function getAvailableSlots(
  date?: string
): Promise<ScheduleSlot[]> {
  try {
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    if (!SHEET_ID) {
      console.error('[✗] GOOGLE_SHEET_ID not set');
      return [];
    }

    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!serviceAccountEmail || !privateKey) {
      console.error('[✗] Service account credentials not set');
      return [];
    }

    const jwt = new JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const doc = new GoogleSpreadsheet(SHEET_ID, jwt);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['schedule'];
    if (!sheet) {
      console.error('[✗] Sheet "schedule" not found');
      return [];
    }

    const rows = await sheet.getRows();
    console.log(`[✓] Loaded ${rows.length} schedule entries`);

    let slots: ScheduleSlot[] = rows.map((row: any, index: number) => ({
      date: row.get('Date')?.toString().trim() || '',
      time: row.get('Time')?.toString().trim() || '',
      customerName: row.get('Customer_Name')?.toString().trim() || '',
      contactInfo: row.get('Contact_Info')?.toString().trim() || '',
      rowIndex: index + 2 // +2 because row 1 is header, and rows are 1-indexed
    }));

    // Get current date (start of today)
    const today = startOfDay(new Date());
    console.log(`[📅] Today's date for filtering: ${format(today, 'yyyy-MM-dd')}`);

    // Filter available slots (no customer booked AND not in the past)
    slots = slots.filter(slot => {
      // Check if booked
      if (slot.customerName || slot.contactInfo) return false;
      
      // Check if date is valid and not in the past
      try {
        const slotDate = startOfDay(parseISO(slot.date));
        const isPastDate = isBefore(slotDate, today);
        
        if (isPastDate) {
          console.log(`[⏭️] Skipping past date: ${slot.date}`);
        }
        
        return !isPastDate; // Include today and future dates
      } catch (err) {
        console.error(`[!] Invalid date format: ${slot.date}`);
        return false;
      }
    });

    // Apply filters
    if (date) {
      slots = slots.filter(slot => slot.date === date);
    }

    console.log(`[✓] Found ${slots.length} available slots`);
    return slots;
  } catch (err: any) {
    console.error('[✗] Schedule error:', err.message);
    return [];
  }
}

export async function bookAppointment(
  date: string,
  time: string,
  customerName: string,
  contactInfo: string
): Promise<{ success: boolean; message: string }> {
  try {
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    if (!SHEET_ID) {
      return { success: false, message: 'Configuration error' };
    }

    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!serviceAccountEmail || !privateKey) {
      return { success: false, message: 'Configuration error' };
    }

    const jwt = new JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const doc = new GoogleSpreadsheet(SHEET_ID, jwt);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['schedule'];
    if (!sheet) {
      return { success: false, message: 'Schedule not found' };
    }

    const rows = await sheet.getRows();

    // Find the matching slot
    let targetRow = null;
    for (const row of rows) {
      const rowDate = row.get('Date')?.toString().trim();
      const rowTime = row.get('Time')?.toString().trim();
      const rowCustomer = row.get('Customer_Name')?.toString().trim();
      const rowContact = row.get('Contact_Info')?.toString().trim();

      // Check if slot matches and is available
      if (rowDate === date && rowTime === time) {
        // Check if already booked
        if (rowCustomer || rowContact) {
          return { 
            success: false, 
            message: `This slot is already booked by ${rowCustomer || 'someone'}` 
          };
        }

        targetRow = row;
        break;
      }
    }

    if (!targetRow) {
      return { 
        success: false, 
        message: 'Slot not found or not available' 
      };
    }

    // Book the slot using direct cell updates
    try {
      const rowIndex = targetRow.rowNumber;
      
      console.log(`[📝] Booking to row ${rowIndex}: C${rowIndex}="${customerName}", D${rowIndex}="${contactInfo}"`);
      
      // Load cells in the range we need to update
      await sheet.loadCells(`C${rowIndex}:D${rowIndex}`);
      
      // Get the cells
      const customerCell = sheet.getCellByA1(`C${rowIndex}`);
      const contactCell = sheet.getCellByA1(`D${rowIndex}`);
      
      // Set values
      customerCell.value = customerName;
      contactCell.value = contactInfo;
      
      // Save the updated cells
      await sheet.saveUpdatedCells();
      
      console.log(`[✓] Booked: ${customerName} - ${date} ${time}`);
      return { 
        success: true, 
        message: `Successfully booked on ${date} at ${time}` 
      };
    } catch (saveErr: any) {
      console.error('[✗] Save error:', saveErr.message);
      return { 
        success: false, 
        message: `Failed to book: ${saveErr.message}` 
      };
    }
  } catch (err: any) {
    console.error('[✗] Booking error:', err.message);
    return { 
      success: false, 
      message: 'Booking failed. Please try again.' 
    };
  }
}

export function formatAvailableSlots(slots: ScheduleSlot[], limit: number = 10): string {
  if (slots.length === 0) {
    return 'No available slots found.';
  }

  const formatted = slots.slice(0, limit).map((slot, i) => 
    `${i + 1}. ${slot.date} в ${slot.time}`
  ).join('\n');

  const remaining = slots.length - limit;
  const suffix = remaining > 0 ? `\n\n...and ${remaining} more slots available` : '';

  return formatted + suffix;
}
