import DetailsModal from './DetailsModal';

function TeacherDetailsModal({ isOpen, teacher, onClose, onEdit }) {
  if (!isOpen || !teacher) return null;

  const details = [
    { label: 'الاسم الكامل', value: teacher.fullName },
    { label: 'الجنس', value: teacher.gender },
    { label: 'التخصص', value: teacher.specialty },
    { label: 'المادة', value: teacher.subject },
    { label: 'الهاتف', value: teacher.phone },
    { label: 'العنوان', value: teacher.address },
    { label: 'الحالة', value: teacher.status },
  ];

  return (
    <DetailsModal
      isOpen={isOpen}
      title="بيانات المعلم"
      items={details}
      onClose={onClose}
      onEdit={() => onEdit(teacher)}
    />
  );
}

export default TeacherDetailsModal;
