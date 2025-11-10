import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    textAlign: 'center',
    marginBottom: 30,
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 15,
  },
  collegeName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 5,
  },
  studentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoColumn: {
    flexDirection: 'column',
  },
  infoLabel: {
    fontSize: 10,
    color: '#666',
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    fontSize: 10,
  },
  tableCell: {
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#000',
    fontSize: 9,
  },
  summary: {
    marginTop: 15,
    fontSize: 11,
    fontWeight: 'bold',
  },
  signature: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: 'bold',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 10,
  },
  watermark: {
    position: 'absolute',
    fontSize: 72,
    color: '#999999',
    opacity: 0.6,
    transform: 'rotate(-45deg)',
    top: '40%',
    left: '10%',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  qrCode: {
    width: 150,
    height: 150,
  },
  qrText: {
    fontSize: 12,
    marginTop: 20,
    textAlign: 'center',
  },
});

type StudentData = {
  user: {
    name: string;
    usn: string | null;
    email: string;
    student_profiles: Array<{
      branches: { branch_name: string } | null;
      academic_batches: { batch_year: string } | null;
    }>;
  };
  marks: Array<{
    semester: number;
    serial_no: number;
    course_code: string;
    course_name: string;
    cie_marks: number;
    see_marks: number;
    total_marks: number;
    credits: number;
    grade: string;
    grade_point: number;
  }>;
};

type TranscriptPDFProps = {
  studentData: StudentData;
  qrDataUrl: string | null;
  logoDataUrl?: string | null;
};

export const TranscriptPDF = ({ studentData, qrDataUrl, logoDataUrl }: TranscriptPDFProps) => {

  // Handle both array and object returns from Supabase
  const profile = Array.isArray(studentData.user.student_profiles)
    ? studentData.user.student_profiles[0]
    : studentData.user.student_profiles;

  const branch = profile?.branches?.branch_name || 'N/A';
  const batch = profile?.academic_batches?.batch_year || 'N/A';

  // Group marks by semester
  const semesterGroups = studentData.marks.reduce((acc, mark) => {
    if (!acc[mark.semester]) {
      acc[mark.semester] = [];
    }
    acc[mark.semester].push(mark);
    return acc;
  }, {} as Record<number, typeof studentData.marks>);

  // Calculate SGPA for a specific semester
  const calculateSGPA = (marks: typeof studentData.marks) => {
    const totalGradePoints = marks.reduce((sum, m) => sum + (m.grade_point || 0) * (m.credits || 0), 0);
    const totalCredits = marks.reduce((sum, m) => sum + (m.credits || 0), 0);
    return totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
  };

  // Calculate CGPA up to and including a specific semester (cumulative)
  // CGPA Formula: Sum of (grade_point * credits) for all semesters up to current / Sum of all credits
  // Example:
  //   Semester 1: CGPA = Sem1 GPA (only sem 1)
  //   Semester 2: CGPA = (Sem1 + Sem2 weighted average)
  //   Semester 3: CGPA = (Sem1 + Sem2 + Sem3 weighted average)
  const calculateCGPA = (upToSemester: number) => {
    // Get all marks from semester 1 up to the specified semester
    const cumulativeMarks = studentData.marks.filter(
      mark => mark.semester >= 1 && mark.semester <= upToSemester
    );

    if (cumulativeMarks.length === 0) return '0.00';

    // Calculate weighted sum of grade points
    const totalGradePoints = cumulativeMarks.reduce(
      (sum, m) => sum + (m.grade_point || 0) * (m.credits || 0),
      0
    );

    // Calculate total credits across all semesters
    const totalCredits = cumulativeMarks.reduce(
      (sum, m) => sum + (m.credits || 0),
      0
    );

    return totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
  };

  const renderWatermark = () => (
    <Text style={styles.watermark}>CONFIDENTIAL</Text>
  );

  const renderHeader = (semester?: number) => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        {logoDataUrl && (
          <Image src={logoDataUrl} style={styles.logo} />
        )}
        <Text style={styles.collegeName}>GLOBAL ACADEMY OF TECHNOLOGY</Text>
      </View>
      <Text style={styles.subtitle}>Provisional Grade Card</Text>
      {semester && (
        <Text style={{ fontSize: 12, marginTop: 10, fontWeight: 'bold' }}>SEMESTER {semester}</Text>
      )}
    </View>
  );

  const renderStudentInfo = (semester: number) => (
    <View style={styles.studentInfo}>
      <View style={styles.infoColumn}>
        <Text style={styles.infoLabel}>USN</Text>
        <Text style={styles.infoValue}>{studentData.user.usn || 'N/A'}</Text>
        <Text style={[styles.infoLabel, { marginTop: 10 }]}>NAME</Text>
        <Text style={styles.infoValue}>{studentData.user.name}</Text>
      </View>
      <View style={styles.infoColumn}>
        <Text style={styles.infoLabel}>SEMESTER</Text>
        <Text style={styles.infoValue}>{semester}</Text>
        <Text style={[styles.infoLabel, { marginTop: 10 }]}>BRANCH</Text>
        <Text style={styles.infoValue}>{branch}</Text>
      </View>
    </View>
  );

  const renderCombinedTable = (marks: typeof studentData.marks) => (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHeader]}>
        <Text style={[styles.tableCell, { width: '5%' }]}>Sl</Text>
        <Text style={[styles.tableCell, { width: '10%' }]}>Code</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>Course Name</Text>
        <Text style={[styles.tableCell, { width: '8%' }]}>CIE</Text>
        <Text style={[styles.tableCell, { width: '8%' }]}>SEE</Text>
        <Text style={[styles.tableCell, { width: '9%' }]}>Total</Text>
        <Text style={[styles.tableCell, { width: '7%' }]}>Cr</Text>
        <Text style={[styles.tableCell, { width: '10%' }]}>Grade</Text>
        <Text style={[styles.tableCell, { width: '13%', borderRightWidth: 0 }]}>Grade Pt</Text>
      </View>
      {marks.map((mark, idx) => (
        <View key={idx} style={[styles.tableRow, idx === marks.length - 1 ? { borderBottomWidth: 0 } : {}]}>
          <Text style={[styles.tableCell, { width: '5%', textAlign: 'center' }]}>{mark.serial_no}</Text>
          <Text style={[styles.tableCell, { width: '10%' }]}>{mark.course_code}</Text>
          <Text style={[styles.tableCell, { width: '25%' }]}>{mark.course_name}</Text>
          <Text style={[styles.tableCell, { width: '8%', textAlign: 'center' }]}>{mark.cie_marks || '-'}</Text>
          <Text style={[styles.tableCell, { width: '8%', textAlign: 'center' }]}>{mark.see_marks || '-'}</Text>
          <Text style={[styles.tableCell, { width: '9%', textAlign: 'center' }]}>{mark.total_marks || '-'}</Text>
          <Text style={[styles.tableCell, { width: '7%', textAlign: 'center' }]}>{mark.credits}</Text>
          <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>{mark.grade || '-'}</Text>
          <Text style={[styles.tableCell, { width: '13%', textAlign: 'center', borderRightWidth: 0 }]}>
            {mark.grade_point || '-'}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <Document>
      {/* Render a page for each semester */}
      {Object.entries(semesterGroups).map(([semester, marks]) => (
        <Page key={semester} size="A4" style={styles.page}>
          {renderWatermark()}
          {renderHeader(Number(semester))}
          {renderStudentInfo(Number(semester))}

          <Text style={styles.sectionTitle}>Course Details & Performance</Text>
          {renderCombinedTable(marks)}

          <View style={styles.summary}>
            <Text>Total Credits (This Semester): {marks.reduce((sum, m) => sum + (m.credits || 0), 0)}</Text>
            <Text style={{ marginTop: 5 }}>SGPA (Semester Grade Point Average): {calculateSGPA(marks)}</Text>
            <Text style={{ marginTop: 5 }}>CGPA (Cumulative Grade Point Average): {calculateCGPA(Number(semester))}</Text>
          </View>

          {/* Digital Signature */}
          <Text style={styles.signature}>Digitally Signed by COE</Text>
        </Page>
      ))}

      {/* QR Code Page */}
      {qrDataUrl && (
        <Page size="A4" style={styles.page}>
          {renderWatermark()}
          <View style={styles.qrContainer}>
            <Image src={qrDataUrl} style={styles.qrCode} />
            <Text style={styles.qrText}>Scan to verify this transcript</Text>
          </View>

          {/* Digital Signature on QR page as well */}
          <Text style={styles.signature}>Digitally Signed by COE</Text>
        </Page>
      )}
    </Document>
  );
};
