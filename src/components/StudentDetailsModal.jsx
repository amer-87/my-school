import DetailsModal from './DetailsModal';

function StudentDetailsModal({ isOpen, student, onClose }) {
  if (!isOpen || !student) return null;

  const details = [
    { label: 'الاسم الرباعي', value: student.fullName },
    { label: 'الجنس', value: student.gender },
    { label: 'تاريخ الميلاد', value: student.dob },
    { label: 'الصف', value: student.grade },
    { label: 'الشعبة', value: student.division },
    { label: 'الهاتف', value: student.phone },
    { label: 'اسم ولي الأمر', value: student.guardianName },
    { label: 'العنوان', value: student.address },
    { label: 'الحالة', value: student.status },
  ];

  return <DetailsModal isOpen={isOpen} title="بيانات الطالب" items={details} onClose={onClose} />;
}

export default StudentDetailsModal;
