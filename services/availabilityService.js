const Availability = require('../models/Availability');
const User = require('../models/User');

const createError = (msg, status = 400) => {
  const err = new Error(msg);
  err.status = status;
  return err;
};

class AvailabilityService {

  async getAvailability(userId, day = null) {
    const availability = await Availability.findOne({ user: userId });
    if (!availability) return [];
    if (day) return availability.slots.filter(s => s.day === day);
    return availability.slots;
  }

  async deleteAvailability(userId, day = null) {
    if (day) {
      return await Availability.findOneAndUpdate(
        { user: userId },
        { $pull: { slots: { day } } },
        { new: true }
      );
    } else {
      return await Availability.deleteOne({ user: userId });
    }
  }

  async setWeeklyAvailability(userId, role, slots) {
    if (!['staff','vet','trainer'].includes(role)) throw createError('Invalid role');

    let availability = await Availability.findOne({ user: userId });
    if (!availability) {
      availability = new Availability({ user: userId, role, slots });
    } else {
      availability.slots = slots; // overwrite existing slots
      availability.role = role;
    }

    await availability.save();
    return { msg: 'Availability updated', availability };
  }

  /**
   * Convert a slot for a given date to a Date object range
   * slot = { day, startTime, endTime, date }
   */
getSlotDateRange(slot) {
  if (!slot.date) {
    throw new Error('Slot must have a date');
  }

  const startDate = new Date(slot.date);
  const [startHour, startMin] = slot.startTime.split(':').map(Number);
  const [endHour, endMin] = slot.endTime.split(':').map(Number);

  startDate.setHours(startHour, startMin, 0, 0);
  const endDate = new Date(startDate);
  endDate.setHours(endHour, endMin, 0, 0);

  return { startDate, endDate };
}



  // async getAvailableStaff() {
  //   try {
  //     console.log('🔍 === START getAvailableStaff DEBUG ===');
  
  //     // METHOD 1: Find staff users through availability records
  //     console.log('🔄 Looking for staff through availability records...');
      
  //     // First, get all availability records for staff roles
  //     const availabilityRecords = await Availability.find({
  //       role: { $in: ['staff', 'admin', 'vet', 'trainer'] }
  //     }).populate('user', 'name email role profileImage isActive');
  
  //     console.log('📅 Availability records found:', availabilityRecords.length);
  //     availabilityRecords.forEach(record => {
  //       console.log(`   - Record: user=${record.user?._id}, role=${record.role}, slots=${record.slots?.length}`);
  //     });
  
  //     // Process the availability records
  //     const availableStaff = availabilityRecords
  //       .filter(record => record.user && record.user.isActive !== false) // Filter active users
  //       .filter(record => record.slots && record.slots.length > 0) // Filter records with slots
  //       .map(record => {
  //         const formattedSlots = record.slots.map(slot => ({
  //           day: slot.day,
  //           startTime: slot.startTime,
  //           endTime: slot.endTime,
  //           date: slot.date
  //         }));
  
  //         return {
  //           _id: record.user._id,
  //           name: record.user.name,
  //           role: record.role, // Use role from availability record
  //           profileImage: record.user.profileImage,
  //           availability: formattedSlots
  //         };
  //       });
  
  //     console.log('👥 Final available staff:', availableStaff.length);
  //     availableStaff.forEach(staff => {
  //       console.log(`   - ${staff.name}: ${staff.availability.length} slots`);
  //     });
  
  //     // METHOD 2: If no results, try direct user query as fallback
  //     if (availableStaff.length === 0) {
  //       console.log('🔄 Falling back to direct user query...');
        
  //       const staffUsers = await User.find({
  //         role: { $in: ['staff', 'admin'] },
  //         isActive: true
  //       }).select('name email role profileImage');
  
  //       console.log('👥 Direct user query found:', staffUsers.length);
        
  //       // Get availability for each staff user
  //       const staffWithAvailability = await Promise.all(
  //         staffUsers.map(async (staff) => {
  //           const availability = await Availability.findOne({ user: staff._id });
            
  //           let formattedSlots = [];
  //           if (availability && availability.slots && availability.slots.length > 0) {
  //             formattedSlots = availability.slots.map(slot => ({
  //               day: slot.day,
  //               startTime: slot.startTime,
  //               endTime: slot.endTime,
  //               date: slot.date
  //             }));
  //           }
  
  //           return {
  //             _id: staff._id,
  //             name: staff.name,
  //             role: staff.role,
  //             profileImage: staff.profileImage,
  //             availability: formattedSlots
  //           };
  //         })
  //       );
  
  //       const filteredStaff = staffWithAvailability.filter(staff => 
  //         staff.availability && staff.availability.length > 0
  //       );
  
  //       console.log('👥 Filtered staff from fallback:', filteredStaff.length);
  //       return filteredStaff;
  //     }
  
  //     console.log('🔍 === END getAvailableStaff DEBUG ===');
  //     return availableStaff;
  
  //   } catch (error) {
  //     console.error('❌ Error in getAvailableStaff service:', error);
  //     throw createError('Failed to fetch available staff', 500);
  //   }
  // }
  // In availabilityService.js - getAvailableStaff method
  async getAvailableStaff() {
    try {
      console.log('🔍 Getting ALL staff availability...');
      
      // Get ALL availability records with their user info
      const availabilityRecords = await Availability.find({})
        .populate('user', 'name email role profileImage isActive')
        .lean();
  
      console.log(`📊 Found ${availabilityRecords.length} total availability records`);
  
      // Show what we found
      availabilityRecords.forEach(record => {
        console.log(`   - ${record.user?.name || 'No user'}: ${record.slots?.length || 0} slots, role: ${record.role}`);
      });
  
      // Simple filter: any record with slots and active user
      const availableStaff = availabilityRecords
        .filter(record => record.user && record.user.isActive !== false)
        .filter(record => record.slots && record.slots.length > 0)
        .map(record => ({
          _id: record.user._id,
          name: record.user.name,
          role: record.role,
          profileImage: record.user.profileImage,
          availability: record.slots // Return ALL slots
        }));
  
      console.log(`✅ Returning ${availableStaff.length} available staff`);
      return availableStaff;
  
    } catch (error) {
      console.error('❌ Error:', error);
      throw createError('Failed to fetch staff', 500);
    }
  }


}

module.exports = new AvailabilityService();
