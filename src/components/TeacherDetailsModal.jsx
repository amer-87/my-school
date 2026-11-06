import DetailsModal from './DetailsModal';

function TeacherDetailsModal({ isOpen, teacher, onClose }) {
  if (!isOpen || !teacher) return null;

  const details = [
    { label: 'الاسم الكامل', value: teacher.fullName },
    { label: 'الجنس', value: teacher.gender },
    { label: 'التخصص', value: teacher.specialty },
    { label: 'المادة', value: teacher.subject },
    { label: 'الهاتف', value: teacher.phone },
    { label: 'البريد الإلكتروني', value: teacher.email },
    { label: 'العنوان', value: teacher.address },
    { label: 'الحالة', value: teacher.status },
  ];

  return <DetailsModal isOpen={isOpen} title="بيانات المعلم" items={details} onClose={onClose} />;
}

export default TeacherDetailsModal;
