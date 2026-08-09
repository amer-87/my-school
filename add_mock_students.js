const db = require('./electron/databaseService');

const firstNames = ['محمد', 'أحمد', 'علي', 'فاطمة', 'زينب', 'سارة', 'عمر', 'يوسف', 'مريم', 'ليلى', 'خالد', 'نورة', 'عبد الله', 'هند', 'إبراهيم', 'ريم', 'حمزة', 'لجين', 'سلمان', 'هيفاء'];
const lastNames = ['الخطيب', 'المصري', 'الحسن', 'الشمري', 'العتيبي', 'القحطاني', 'الزهراني', 'الحربي', 'الغامدي', 'العسيري', 'التميمي', 'المالكي', 'السبيعي', 'الرويلي', 'الرشيدي'];
const addresses = ['حي الروضة', 'حي الملز', 'حي العليا', 'شارع الملك فهد', 'حي النسيم', 'حي الشفا', 'حي الملقا', 'حي الياسمين'];

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(startYear, endYear) {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function getRandomPhone() {
  return '05' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
}

async function run() {
  try {
    await db.initializeDatabase();

    const appData = await db.getAppData();
    const divisions = appData.divisions;
    const grades = appData.grades;

    console.log(`Found ${divisions.length} divisions and ${grades.length} grades.`);

    let totalAdded = 0;
    const summaryList = [];

    for (const div of divisions) {
      const grade = grades.find(g => g.id === div.gradeId);
      if (!grade) continue;

      console.log(`Adding 10 students to ${grade.name} - ${div.name}...`);
      for (let i = 0; i < 10; i++) {
        const firstName = getRandom(firstNames);
        const lastName = getRandom(lastNames);
        const gender = (firstName === 'فاطمة' || firstName === 'زينب' || firstName === 'سارة' || firstName === 'مريم' || firstName === 'ليلى' || firstName === 'نورة' || firstName === 'هند' || firstName === 'ريم' || firstName === 'لجين' || firstName === 'هيفاء') ? 'أنثى' : 'ذكر';

        const payload = {
          fullName: `${firstName} ${lastName}`,
          gender: gender,
          dob: getRandomDate(2013, 2018),
          grade: grade.name,
          gradeId: grade.id,
          division: div.name,
          divisionId: div.id,
          phone: getRandomPhone(),
          guardianName: `${getRandom(firstNames)} ${lastName}`,
          address: getRandom(addresses),
          status: 'نشط'
        };

        await db.createStudent(payload, 1, "2026-2027");
        totalAdded++;
      }
      summaryList.push(`${grade.name} (${div.name}): 10 students`);
    }

    console.log('\n--- Summary ---');
    console.log(`Total students added: ${totalAdded}`);
    summaryList.forEach(line => console.log(line));

    process.exit(0);
  } catch (error) {
    console.error('Error adding mock students:', error);
    process.exit(1);
  }
}

run();
