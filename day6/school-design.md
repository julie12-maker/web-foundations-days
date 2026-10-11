# School Database Design

## Tables

### students
Stores one row per student: `student_id` (primary key), `name` and `email`. The email is `UNIQUE`, so two students cannot share one, and both name and email are `NOT NULL`.

### courses
Stores one row per course: `course_id` (primary key), `title` and `credits`. Every course has a title and a number of credits.

### enrolments
Stores one row per student-on-course pairing: `enrolment_id` (primary key), `student_id` and `course_id` (both foreign keys), and `grade`. The grade can be empty until one is given.

## Relationships

- **students to enrolments is one-to-many:** one student can have many enrolments, but each enrolment belongs to one student.
- **courses to enrolments is one-to-many:** one course can have many enrolments, but each enrolment belongs to one course.
- **students to courses is many-to-many:** a student can take many courses, and a course has many students.

A join table is needed because a single column cannot hold a list of courses for a student without breaking the rules of a relational table. The `enrolments` table solves this by storing one row for each student-course pair. It also holds the grade, which belongs to the pairing and not to the student or the course alone. The rule `UNIQUE (student_id, course_id)` stops the same student enrolling on the same course twice.

## Index

I would add an index on `enrolments(course_id)`:

```sql
CREATE INDEX idx_enrolments_course ON enrolments(course_id);
```

**Reason:** the query "all students on one course" and the count per course both search enrolments by `course_id`. Without an index the database reads every row. The unique rule already gives an index starting with `student_id`, so lookups by student are covered, but lookups by course are not.

## SQL or NoSQL?

I would choose SQL for this system. School data is highly structured and full of relationships between students, courses and grades. A relational database enforces those relationships with foreign keys, prevents duplicates with unique rules, and answers questions such as "which students have no enrolments?" with joins. Consistency matters because a grade must always point to a real student and a real course. NoSQL is better suited to flexible, changing data or very large scale, and neither is the main need here.