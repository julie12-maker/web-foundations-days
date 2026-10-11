-- ---------- Tables ----------
PRAGMA foreign_keys = ON;

CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    title     TEXT NOT NULL,
    credits   INTEGER NOT NULL
);

CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY,
    student_id   INTEGER NOT NULL,
    course_id    INTEGER NOT NULL,
    grade        TEXT,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (course_id)  REFERENCES courses(course_id),
    UNIQUE (student_id, course_id)
);

-- ---------- Sample data ----------
INSERT INTO students (name, email) VALUES
    ('Amina Otieno', 'amina@example.com'),
    ('Brian Kamau',  'brian@example.com'),
    ('Cynthia Wanjiru', 'cynthia@example.com'),
    ('David Mwangi', 'david@example.com');

INSERT INTO courses (title, credits) VALUES
    ('Web Foundations', 3),
    ('Databases', 4),
    ('Mathematics', 3);

INSERT INTO enrolments (student_id, course_id, grade) VALUES
    (1, 1, 'A'),
    (1, 2, 'B'),
    (2, 1, 'B'),
    (2, 3, 'C'),
    (3, 2, 'A'),
    (3, 3, NULL);

-- ---------- Queries ----------

-- 1. All courses for one student (by name)
SELECT courses.title, enrolments.grade
FROM students
JOIN enrolments ON enrolments.student_id = students.student_id
JOIN courses    ON courses.course_id = enrolments.course_id
WHERE students.name = 'Amina Otieno';

-- 2. All students on one course
SELECT students.name, students.email
FROM courses
JOIN enrolments ON enrolments.course_id = courses.course_id
JOIN students   ON students.student_id = enrolments.student_id
WHERE courses.title = 'Databases';

-- 3. Number of students per course
SELECT courses.title, COUNT(enrolments.enrolment_id) AS student_count
FROM courses
LEFT JOIN enrolments ON enrolments.course_id = courses.course_id
GROUP BY courses.course_id, courses.title;

-- 4. Students who have no enrolments
SELECT students.name, students.email
FROM students
LEFT JOIN enrolments ON enrolments.student_id = students.student_id
WHERE enrolments.enrolment_id IS NULL;

-- 5. Update one enrolment's grade
UPDATE enrolments
SET grade = 'B'
WHERE student_id = 3 AND course_id = 3;