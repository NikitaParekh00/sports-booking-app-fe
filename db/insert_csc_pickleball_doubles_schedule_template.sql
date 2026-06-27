-- =============================================================================
-- CSC Pickleball — full schedule (138 matches, 4 courts, all categories)
-- Source: CSC Pickle Ball Tournament Schedule.xlsx
-- Event date: 2026-06-28 · Timezone: Asia/Kolkata
-- =============================================================================
-- Timing (from sheet):
--   Mens:    6 matches/court/hour · 10 min slots · Phases 9-10, 10-11, 11-12, 12-1
--   Females: Courts 3-4 · 1:30-3:00 PM · 10 matches · 9 min slots
--   Mixed:   Courts 1-2 from 2:30 PM · Courts 3-4 from 3:00 PM · 10 min slots
--
-- BEFORE RUNNING:
--   1. Participants already uploaded (144 players).
--   2. Replace fab66efc-f0da-4d4a-a9f3-42cad5fb1f09 (PREVIEW + INSERT sections).
--   3. Run PREVIEW — fix any missing player names.
--   4. Run INSERT — replaces all CSC-* matches for this tournament.
-- =============================================================================

-- ─── PREVIEW: unresolved player names ────────────────────────────────────────
WITH p AS (
  SELECT 'fab66efc-f0da-4d4a-a9f3-42cad5fb1f09'::uuid AS tournament_id
),
wanted AS (
  SELECT * FROM (VALUES
    ('CSC-FD-A-01', 'Females Doubles · Group A', '3', '2026-06-28', '13:30:00', 'Babita Rana', 'Parul Gupta', 'Esha Dedavat', 'Asmita Jain'),
    ('CSC-FD-A-02', 'Females Doubles · Group A', '3', '2026-06-28', '13:39:00', 'Nidhi Maskare', 'Niyati Fofadia', 'Pooja Patekar', 'Sandya Pujari'),
    ('CSC-FD-A-03', 'Females Doubles · Group A', '3', '2026-06-28', '13:48:00', 'Urvi Mota', 'Monica Pandya', 'Babita Rana', 'Parul Gupta'),
    ('CSC-FD-A-04', 'Females Doubles · Group A', '3', '2026-06-28', '13:57:00', 'Esha Dedavat', 'Asmita Jain', 'Nidhi Maskare', 'Niyati Fofadia'),
    ('CSC-FD-A-05', 'Females Doubles · Group A', '3', '2026-06-28', '14:06:00', 'Pooja Patekar', 'Sandya Pujari', 'Urvi Mota', 'Monica Pandya'),
    ('CSC-FD-A-06', 'Females Doubles · Group A', '3', '2026-06-28', '14:15:00', 'Babita Rana', 'Parul Gupta', 'Nidhi Maskare', 'Niyati Fofadia'),
    ('CSC-FD-A-07', 'Females Doubles · Group A', '3', '2026-06-28', '14:24:00', 'Esha Dedavat', 'Asmita Jain', 'Pooja Patekar', 'Sandya Pujari'),
    ('CSC-FD-A-08', 'Females Doubles · Group A', '3', '2026-06-28', '14:33:00', 'Nidhi Maskare', 'Niyati Fofadia', 'Urvi Mota', 'Monica Pandya'),
    ('CSC-FD-A-09', 'Females Doubles · Group A', '3', '2026-06-28', '14:42:00', 'Babita Rana', 'Parul Gupta', 'Pooja Patekar', 'Sandya Pujari'),
    ('CSC-FD-A-10', 'Females Doubles · Group A', '3', '2026-06-28', '14:51:00', 'Esha Dedavat', 'Asmita Jain', 'Urvi Mota', 'Monica Pandya'),
    ('CSC-FD-B-01', 'Females Doubles · Group B', '4', '2026-06-28', '13:30:00', 'Deepali Bardia', 'Taruna Vaishnav', 'Hiral Nandu', 'Archana Kumawat'),
    ('CSC-FD-B-02', 'Females Doubles · Group B', '4', '2026-06-28', '13:39:00', 'Krupa Sanghavi', 'Kenali Shah', 'Maitri Hemant Vikam', 'Dharmi Nandu'),
    ('CSC-FD-B-03', 'Females Doubles · Group B', '4', '2026-06-28', '13:48:00', 'Theertha Cp', 'Ruchita', 'Deepali Bardia', 'Taruna Vaishnav'),
    ('CSC-FD-B-04', 'Females Doubles · Group B', '4', '2026-06-28', '13:57:00', 'Hiral Nandu', 'Archana Kumawat', 'Krupa Sanghavi', 'Kenali Shah'),
    ('CSC-FD-B-05', 'Females Doubles · Group B', '4', '2026-06-28', '14:06:00', 'Maitri Hemant Vikam', 'Dharmi Nandu', 'Theertha Cp', 'Ruchita'),
    ('CSC-FD-B-06', 'Females Doubles · Group B', '4', '2026-06-28', '14:15:00', 'Deepali Bardia', 'Taruna Vaishnav', 'Krupa Sanghavi', 'Kenali Shah'),
    ('CSC-FD-B-07', 'Females Doubles · Group B', '4', '2026-06-28', '14:24:00', 'Hiral Nandu', 'Archana Kumawat', 'Maitri Hemant Vikam', 'Dharmi Nandu'),
    ('CSC-FD-B-08', 'Females Doubles · Group B', '4', '2026-06-28', '14:33:00', 'Krupa Sanghavi', 'Kenali Shah', 'Theertha Cp', 'Ruchita'),
    ('CSC-FD-B-09', 'Females Doubles · Group B', '4', '2026-06-28', '14:42:00', 'Deepali Bardia', 'Taruna Vaishnav', 'Maitri Hemant Vikam', 'Dharmi Nandu'),
    ('CSC-FD-B-10', 'Females Doubles · Group B', '4', '2026-06-28', '14:51:00', 'Hiral Nandu', 'Archana Kumawat', 'Theertha Cp', 'Ruchita'),
    ('CSC-MD-A-01', 'Mens Doubles · Group A', '1', '2026-06-28', '09:00:00', 'Krish Agarwal', 'Harsh Kansara', 'Pratik Solanki', 'Aryan Pawar'),
    ('CSC-MD-A-02', 'Mens Doubles · Group A', '1', '2026-06-28', '09:10:00', 'Sagar Aswal', 'Kamal A', 'Zaid Khandwani', 'Shreyans Kothari'),
    ('CSC-MD-A-03', 'Mens Doubles · Group A', '1', '2026-06-28', '09:20:00', 'Krish Agarwal', 'Harsh Kansara', 'Sagar Aswal', 'Kamal A'),
    ('CSC-MD-A-04', 'Mens Doubles · Group A', '1', '2026-06-28', '09:30:00', 'Pratik Solanki', 'Aryan Pawar', 'Zaid Khandwani', 'Shreyans Kothari'),
    ('CSC-MD-A-05', 'Mens Doubles · Group A', '1', '2026-06-28', '09:40:00', 'Krish Agarwal', 'Harsh Kansara', 'Zaid Khandwani', 'Shreyans Kothari'),
    ('CSC-MD-A-06', 'Mens Doubles · Group A', '1', '2026-06-28', '09:50:00', 'Pratik Solanki', 'Aryan Pawar', 'Sagar Aswal', 'Kamal A'),
    ('CSC-MD-E-01', 'Mens Doubles · Group E', '1', '2026-06-28', '10:00:00', 'Arag Daga', 'Tanishk', 'Prithviraj Todi', 'Ramesh Jain'),
    ('CSC-MD-E-02', 'Mens Doubles · Group E', '1', '2026-06-28', '10:10:00', 'Saksham Maheshwari', 'Harsh Dargar', 'Smeet Parikh', 'Sagar Parikh'),
    ('CSC-MD-E-03', 'Mens Doubles · Group E', '1', '2026-06-28', '10:20:00', 'Arag Daga', 'Tanishk', 'Saksham Maheshwari', 'Harsh Dargar'),
    ('CSC-MD-E-04', 'Mens Doubles · Group E', '1', '2026-06-28', '10:30:00', 'Prithviraj Todi', 'Ramesh Jain', 'Smeet Parikh', 'Sagar Parikh'),
    ('CSC-MD-E-05', 'Mens Doubles · Group E', '1', '2026-06-28', '10:40:00', 'Arag Daga', 'Tanishk', 'Smeet Parikh', 'Sagar Parikh'),
    ('CSC-MD-E-06', 'Mens Doubles · Group E', '1', '2026-06-28', '10:50:00', 'Prithviraj Todi', 'Ramesh Jain', 'Saksham Maheshwari', 'Harsh Dargar'),
    ('CSC-MD-I-01', 'Mens Doubles · Group I', '1', '2026-06-28', '11:00:00', 'Anish Jalui', 'Giriraj Jadeja', 'Kamal Agarwal', 'Nayan'),
    ('CSC-MD-I-02', 'Mens Doubles · Group I', '1', '2026-06-28', '11:10:00', 'Mitesh Raja', 'Karthik', 'Sumit Sharma', 'Deepak Bothra'),
    ('CSC-MD-I-03', 'Mens Doubles · Group I', '1', '2026-06-28', '11:20:00', 'Anish Jalui', 'Giriraj Jadeja', 'Mitesh Raja', 'Karthik'),
    ('CSC-MD-I-04', 'Mens Doubles · Group I', '1', '2026-06-28', '11:30:00', 'Kamal Agarwal', 'Nayan', 'Sumit Sharma', 'Deepak Bothra'),
    ('CSC-MD-I-05', 'Mens Doubles · Group I', '1', '2026-06-28', '11:40:00', 'Anish Jalui', 'Giriraj Jadeja', 'Sumit Sharma', 'Deepak Bothra'),
    ('CSC-MD-I-06', 'Mens Doubles · Group I', '1', '2026-06-28', '11:50:00', 'Kamal Agarwal', 'Nayan', 'Mitesh Raja', 'Karthik'),
    ('CSC-MD-M-01', 'Mens Doubles · Group M', '1', '2026-06-28', '12:00:00', 'Anand Jain', 'Ankit Rathi', 'Sumit Bajaj', 'Palak'),
    ('CSC-MD-M-02', 'Mens Doubles · Group M', '1', '2026-06-28', '12:10:00', 'Mohak Ishwar', 'Vinit', 'Kartil Jain', 'Mudrank Jain'),
    ('CSC-MD-M-03', 'Mens Doubles · Group M', '1', '2026-06-28', '12:20:00', 'Anand Jain', 'Ankit Rathi', 'Mohak Ishwar', 'Vinit'),
    ('CSC-MD-M-04', 'Mens Doubles · Group M', '1', '2026-06-28', '12:30:00', 'Sumit Bajaj', 'Palak', 'Kartil Jain', 'Mudrank Jain'),
    ('CSC-MD-M-05', 'Mens Doubles · Group M', '1', '2026-06-28', '12:40:00', 'Anand Jain', 'Ankit Rathi', 'Kartil Jain', 'Mudrank Jain'),
    ('CSC-MD-M-06', 'Mens Doubles · Group M', '1', '2026-06-28', '12:50:00', 'Sumit Bajaj', 'Palak', 'Mohak Ishwar', 'Vinit'),
    ('CSC-MD-B-01', 'Mens Doubles · Group B', '2', '2026-06-28', '09:00:00', 'Mehul Bhastana', 'Prerit Jain', 'Neeraj Surendra Jaiswal', 'Srikant Amarjeet Singh'),
    ('CSC-MD-B-02', 'Mens Doubles · Group B', '2', '2026-06-28', '09:10:00', 'Nikhil Agarwal', 'Neeraj Mishra', 'Piyush Laddha', 'Govind Parashar'),
    ('CSC-MD-B-03', 'Mens Doubles · Group B', '2', '2026-06-28', '09:20:00', 'Mehul Bhastana', 'Prerit Jain', 'Nikhil Agarwal', 'Neeraj Mishra'),
    ('CSC-MD-B-04', 'Mens Doubles · Group B', '2', '2026-06-28', '09:30:00', 'Neeraj Surendra Jaiswal', 'Srikant Amarjeet Singh', 'Piyush Laddha', 'Govind Parashar'),
    ('CSC-MD-B-05', 'Mens Doubles · Group B', '2', '2026-06-28', '09:40:00', 'Mehul Bhastana', 'Prerit Jain', 'Piyush Laddha', 'Govind Parashar'),
    ('CSC-MD-B-06', 'Mens Doubles · Group B', '2', '2026-06-28', '09:50:00', 'Neeraj Surendra Jaiswal', 'Srikant Amarjeet Singh', 'Nikhil Agarwal', 'Neeraj Mishra'),
    ('CSC-MD-F-01', 'Mens Doubles · Group F', '2', '2026-06-28', '10:00:00', 'Vijay Ladha', 'Rohit Jain', 'Ram Goenka', 'Venil Mehta'),
    ('CSC-MD-F-02', 'Mens Doubles · Group F', '2', '2026-06-28', '10:10:00', 'Rishabh Parekh', 'Harshit Makwana', 'Vedant Harikrishan Gupta', 'Lance'),
    ('CSC-MD-F-03', 'Mens Doubles · Group F', '2', '2026-06-28', '10:20:00', 'Vijay Ladha', 'Rohit Jain', 'Rishabh Parekh', 'Harshit Makwana'),
    ('CSC-MD-F-04', 'Mens Doubles · Group F', '2', '2026-06-28', '10:30:00', 'Ram Goenka', 'Venil Mehta', 'Vedant Harikrishan Gupta', 'Lance'),
    ('CSC-MD-F-05', 'Mens Doubles · Group F', '2', '2026-06-28', '10:40:00', 'Vijay Ladha', 'Rohit Jain', 'Vedant Harikrishan Gupta', 'Lance'),
    ('CSC-MD-F-06', 'Mens Doubles · Group F', '2', '2026-06-28', '10:50:00', 'Ram Goenka', 'Venil Mehta', 'Rishabh Parekh', 'Harshit Makwana'),
    ('CSC-MD-J-01', 'Mens Doubles · Group J', '2', '2026-06-28', '11:00:00', 'Hassan Khatri', 'Siddharth Kyal', 'Rohit Nagarkar', 'Ayush Shah'),
    ('CSC-MD-J-02', 'Mens Doubles · Group J', '2', '2026-06-28', '11:10:00', 'Ronak Osthwal', 'Ganesh Koshti', 'Yash Choumal', 'CA Neeraj Mishra'),
    ('CSC-MD-J-03', 'Mens Doubles · Group J', '2', '2026-06-28', '11:20:00', 'Hassan Khatri', 'Siddharth Kyal', 'Ronak Osthwal', 'Ganesh Koshti'),
    ('CSC-MD-J-04', 'Mens Doubles · Group J', '2', '2026-06-28', '11:30:00', 'Rohit Nagarkar', 'Ayush Shah', 'Yash Choumal', 'CA Neeraj Mishra'),
    ('CSC-MD-J-05', 'Mens Doubles · Group J', '2', '2026-06-28', '11:40:00', 'Hassan Khatri', 'Siddharth Kyal', 'Yash Choumal', 'CA Neeraj Mishra'),
    ('CSC-MD-J-06', 'Mens Doubles · Group J', '2', '2026-06-28', '11:50:00', 'Rohit Nagarkar', 'Ayush Shah', 'Ronak Osthwal', 'Ganesh Koshti'),
    ('CSC-MD-C-01', 'Mens Doubles · Group C', '3', '2026-06-28', '09:00:00', 'Ajay Soni', 'Munket Soni', 'Ketan Patil', 'Rajan Tiwari'),
    ('CSC-MD-C-02', 'Mens Doubles · Group C', '3', '2026-06-28', '09:10:00', 'Mayur Tank', 'Hardik Chotalia', 'Mehul Patel', 'Parth Shrimankar'),
    ('CSC-MD-C-03', 'Mens Doubles · Group C', '3', '2026-06-28', '09:20:00', 'Ajay Soni', 'Munket Soni', 'Mayur Tank', 'Hardik Chotalia'),
    ('CSC-MD-C-04', 'Mens Doubles · Group C', '3', '2026-06-28', '09:30:00', 'Ketan Patil', 'Rajan Tiwari', 'Mehul Patel', 'Parth Shrimankar'),
    ('CSC-MD-C-05', 'Mens Doubles · Group C', '3', '2026-06-28', '09:40:00', 'Ajay Soni', 'Munket Soni', 'Mehul Patel', 'Parth Shrimankar'),
    ('CSC-MD-C-06', 'Mens Doubles · Group C', '3', '2026-06-28', '09:50:00', 'Ketan Patil', 'Rajan Tiwari', 'Mayur Tank', 'Hardik Chotalia'),
    ('CSC-MD-G-01', 'Mens Doubles · Group G', '3', '2026-06-28', '10:00:00', 'Alessan Agrawal', 'Kunal Modi', 'Harshil Shah', 'Ashok Biyani'),
    ('CSC-MD-G-02', 'Mens Doubles · Group G', '3', '2026-06-28', '10:10:00', 'Nivesh Beria', 'Parth Thathagar', 'Pravin Thanvi', 'Mohit Chothwani'),
    ('CSC-MD-G-03', 'Mens Doubles · Group G', '3', '2026-06-28', '10:20:00', 'Alessan Agrawal', 'Kunal Modi', 'Nivesh Beria', 'Parth Thathagar'),
    ('CSC-MD-G-04', 'Mens Doubles · Group G', '3', '2026-06-28', '10:30:00', 'Harshil Shah', 'Ashok Biyani', 'Pravin Thanvi', 'Mohit Chothwani'),
    ('CSC-MD-G-05', 'Mens Doubles · Group G', '3', '2026-06-28', '10:40:00', 'Alessan Agrawal', 'Kunal Modi', 'Pravin Thanvi', 'Mohit Chothwani'),
    ('CSC-MD-G-06', 'Mens Doubles · Group G', '3', '2026-06-28', '10:50:00', 'Harshil Shah', 'Ashok Biyani', 'Nivesh Beria', 'Parth Thathagar'),
    ('CSC-MD-K-01', 'Mens Doubles · Group K', '3', '2026-06-28', '11:00:00', 'Harshit Kalla', 'Yash Bansal', 'Kartik Ramesh Ladha', 'Sanyam Jain'),
    ('CSC-MD-K-02', 'Mens Doubles · Group K', '3', '2026-06-28', '11:10:00', 'Rocky Patil', 'Ronak Agarwal', 'Rohit Ningoo', 'Pratik Shinde'),
    ('CSC-MD-K-03', 'Mens Doubles · Group K', '3', '2026-06-28', '11:20:00', 'Harshit Kalla', 'Yash Bansal', 'Rocky Patil', 'Ronak Agarwal'),
    ('CSC-MD-K-04', 'Mens Doubles · Group K', '3', '2026-06-28', '11:30:00', 'Kartik Ramesh Ladha', 'Sanyam Jain', 'Rohit Ningoo', 'Pratik Shinde'),
    ('CSC-MD-K-05', 'Mens Doubles · Group K', '3', '2026-06-28', '11:40:00', 'Harshit Kalla', 'Yash Bansal', 'Rohit Ningoo', 'Pratik Shinde'),
    ('CSC-MD-K-06', 'Mens Doubles · Group K', '3', '2026-06-28', '11:50:00', 'Kartik Ramesh Ladha', 'Sanyam Jain', 'Rocky Patil', 'Ronak Agarwal'),
    ('CSC-MD-D-01', 'Mens Doubles · Group D', '4', '2026-06-28', '09:00:00', 'Jayant Mehra', 'Shonak Gupta', 'Krushabh Naik', 'Puneet Trivedi'),
    ('CSC-MD-D-02', 'Mens Doubles · Group D', '4', '2026-06-28', '09:10:00', 'Navneet Upadhyay', 'Tarun Kothari', 'Rahul Bhuva', 'Kapil Goyal'),
    ('CSC-MD-D-03', 'Mens Doubles · Group D', '4', '2026-06-28', '09:20:00', 'Jayant Mehra', 'Shonak Gupta', 'Navneet Upadhyay', 'Tarun Kothari'),
    ('CSC-MD-D-04', 'Mens Doubles · Group D', '4', '2026-06-28', '09:30:00', 'Krushabh Naik', 'Puneet Trivedi', 'Rahul Bhuva', 'Kapil Goyal'),
    ('CSC-MD-D-05', 'Mens Doubles · Group D', '4', '2026-06-28', '09:40:00', 'Jayant Mehra', 'Shonak Gupta', 'Rahul Bhuva', 'Kapil Goyal'),
    ('CSC-MD-D-06', 'Mens Doubles · Group D', '4', '2026-06-28', '09:50:00', 'Krushabh Naik', 'Puneet Trivedi', 'Navneet Upadhyay', 'Tarun Kothari'),
    ('CSC-MD-H-01', 'Mens Doubles · Group H', '4', '2026-06-28', '10:00:00', 'Bhavuk Singhal', 'Harshit Sethi', 'Mayur Mundhra', 'Aba Parab'),
    ('CSC-MD-H-02', 'Mens Doubles · Group H', '4', '2026-06-28', '10:10:00', 'Vaibhav Shah', 'Pravesh Jain', 'Vishal Joshi', 'Aditya Seth'),
    ('CSC-MD-H-03', 'Mens Doubles · Group H', '4', '2026-06-28', '10:20:00', 'Bhavuk Singhal', 'Harshit Sethi', 'Vaibhav Shah', 'Pravesh Jain'),
    ('CSC-MD-H-04', 'Mens Doubles · Group H', '4', '2026-06-28', '10:30:00', 'Mayur Mundhra', 'Aba Parab', 'Vishal Joshi', 'Aditya Seth'),
    ('CSC-MD-H-05', 'Mens Doubles · Group H', '4', '2026-06-28', '10:40:00', 'Bhavuk Singhal', 'Harshit Sethi', 'Vishal Joshi', 'Aditya Seth'),
    ('CSC-MD-H-06', 'Mens Doubles · Group H', '4', '2026-06-28', '10:50:00', 'Mayur Mundhra', 'Aba Parab', 'Vaibhav Shah', 'Pravesh Jain'),
    ('CSC-MD-L-01', 'Mens Doubles · Group L', '4', '2026-06-28', '11:00:00', 'Akash Bajaj', 'Mayank Bajaj', 'Akshay Amin', 'Vikas Gupta'),
    ('CSC-MD-L-02', 'Mens Doubles · Group L', '4', '2026-06-28', '11:10:00', 'CA Karan Parmar', 'CA Divyang Kothari', 'Morris Lopes', 'Darryl Gonsalves'),
    ('CSC-MD-L-03', 'Mens Doubles · Group L', '4', '2026-06-28', '11:20:00', 'Akash Bajaj', 'Mayank Bajaj', 'CA Karan Parmar', 'CA Divyang Kothari'),
    ('CSC-MD-L-04', 'Mens Doubles · Group L', '4', '2026-06-28', '11:30:00', 'Akshay Amin', 'Vikas Gupta', 'Morris Lopes', 'Darryl Gonsalves'),
    ('CSC-MD-L-05', 'Mens Doubles · Group L', '4', '2026-06-28', '11:40:00', 'Akash Bajaj', 'Mayank Bajaj', 'Morris Lopes', 'Darryl Gonsalves'),
    ('CSC-MD-L-06', 'Mens Doubles · Group L', '4', '2026-06-28', '11:50:00', 'Akshay Amin', 'Vikas Gupta', 'CA Karan Parmar', 'CA Divyang Kothari'),
    ('CSC-XD-A-01', 'Mixed Doubles · Group A', '1', '2026-06-28', '14:30:00', 'Akshay Amin', 'Shilpa Poojari', 'Deepali Bardia', 'Kartik Meridatta'),
    ('CSC-XD-A-02', 'Mixed Doubles · Group A', '1', '2026-06-28', '14:40:00', 'Dviti Shah', 'Manan Shah', 'Harshit Sethi', 'Babita'),
    ('CSC-XD-A-03', 'Mixed Doubles · Group A', '1', '2026-06-28', '14:50:00', 'Morris Lopes', 'Aleta Almeida', 'Akshay Amin', 'Shilpa Poojari'),
    ('CSC-XD-A-04', 'Mixed Doubles · Group A', '1', '2026-06-28', '15:00:00', 'Deepali Bardia', 'Kartik Meridatta', 'Dviti Shah', 'Manan Shah'),
    ('CSC-XD-A-05', 'Mixed Doubles · Group A', '1', '2026-06-28', '15:10:00', 'Akshay Amin', 'Shilpa Poojari', 'Harshit Sethi', 'Babita'),
    ('CSC-XD-A-06', 'Mixed Doubles · Group A', '1', '2026-06-28', '15:20:00', 'Deepali Bardia', 'Kartik Meridatta', 'Morris Lopes', 'Aleta Almeida'),
    ('CSC-XD-A-07', 'Mixed Doubles · Group A', '1', '2026-06-28', '15:30:00', 'Dviti Shah', 'Manan Shah', 'Morris Lopes', 'Aleta Almeida'),
    ('CSC-XD-A-08', 'Mixed Doubles · Group A', '1', '2026-06-28', '15:40:00', 'Akshay Amin', 'Shilpa Poojari', 'Dviti Shah', 'Manan Shah'),
    ('CSC-XD-A-09', 'Mixed Doubles · Group A', '1', '2026-06-28', '15:50:00', 'Harshit Sethi', 'Babita', 'Morris Lopes', 'Aleta Almeida'),
    ('CSC-XD-A-10', 'Mixed Doubles · Group A', '1', '2026-06-28', '16:00:00', 'Deepali Bardia', 'Kartik Meridatta', 'Harshit Sethi', 'Babita'),
    ('CSC-XD-B-01', 'Mixed Doubles · Group B', '2', '2026-06-28', '14:30:00', 'Aashi Mour', 'Rishabh Parekh', 'Arag Daga', 'Rakshita'),
    ('CSC-XD-B-02', 'Mixed Doubles · Group B', '2', '2026-06-28', '14:40:00', 'Archana Kumawat', 'CA Ashish Mishra', 'Prerit Mehta', 'Urvi Mota'),
    ('CSC-XD-B-03', 'Mixed Doubles · Group B', '2', '2026-06-28', '14:50:00', 'Maitri Hemant Vikam', 'Vaibhav Shah', 'Aashi Mour', 'Rishabh Parekh'),
    ('CSC-XD-B-04', 'Mixed Doubles · Group B', '2', '2026-06-28', '15:00:00', 'Arag Daga', 'Rakshita', 'Archana Kumawat', 'CA Ashish Mishra'),
    ('CSC-XD-B-05', 'Mixed Doubles · Group B', '2', '2026-06-28', '15:10:00', 'Aashi Mour', 'Rishabh Parekh', 'Prerit Mehta', 'Urvi Mota'),
    ('CSC-XD-B-06', 'Mixed Doubles · Group B', '2', '2026-06-28', '15:20:00', 'Arag Daga', 'Rakshita', 'Maitri Hemant Vikam', 'Vaibhav Shah'),
    ('CSC-XD-B-07', 'Mixed Doubles · Group B', '2', '2026-06-28', '15:30:00', 'Archana Kumawat', 'CA Ashish Mishra', 'Maitri Hemant Vikam', 'Vaibhav Shah'),
    ('CSC-XD-B-08', 'Mixed Doubles · Group B', '2', '2026-06-28', '15:40:00', 'Aashi Mour', 'Rishabh Parekh', 'Archana Kumawat', 'CA Ashish Mishra'),
    ('CSC-XD-B-09', 'Mixed Doubles · Group B', '2', '2026-06-28', '15:50:00', 'Prerit Mehta', 'Urvi Mota', 'Maitri Hemant Vikam', 'Vaibhav Shah'),
    ('CSC-XD-B-10', 'Mixed Doubles · Group B', '2', '2026-06-28', '16:00:00', 'Arag Daga', 'Rakshita', 'Prerit Mehta', 'Urvi Mota'),
    ('CSC-XD-C-01', 'Mixed Doubles · Group C', '3', '2026-06-28', '15:00:00', 'Esha Dedavat', 'Akshan Agrawal', 'Neeraj Surendra Jaiswal', 'Sakshi Jaiswal'),
    ('CSC-XD-C-02', 'Mixed Doubles · Group C', '3', '2026-06-28', '15:10:00', 'Sagar Aswal', 'Harshita Kalla', 'Sakshi Chavan', 'Akshay Jagani'),
    ('CSC-XD-C-03', 'Mixed Doubles · Group C', '3', '2026-06-28', '15:20:00', 'Vikas Gupta', 'Priya Gupta', 'Esha Dedavat', 'Akshan Agrawal'),
    ('CSC-XD-C-04', 'Mixed Doubles · Group C', '3', '2026-06-28', '15:30:00', 'Neeraj Surendra Jaiswal', 'Sakshi Jaiswal', 'Sagar Aswal', 'Harshita Kalla'),
    ('CSC-XD-C-05', 'Mixed Doubles · Group C', '3', '2026-06-28', '15:40:00', 'Esha Dedavat', 'Akshan Agrawal', 'Sakshi Chavan', 'Akshay Jagani'),
    ('CSC-XD-C-06', 'Mixed Doubles · Group C', '3', '2026-06-28', '15:50:00', 'Neeraj Surendra Jaiswal', 'Sakshi Jaiswal', 'Vikas Gupta', 'Priya Gupta'),
    ('CSC-XD-C-07', 'Mixed Doubles · Group C', '3', '2026-06-28', '16:00:00', 'Sagar Aswal', 'Harshita Kalla', 'Vikas Gupta', 'Priya Gupta'),
    ('CSC-XD-C-08', 'Mixed Doubles · Group C', '3', '2026-06-28', '16:10:00', 'Esha Dedavat', 'Akshan Agrawal', 'Sagar Aswal', 'Harshita Kalla'),
    ('CSC-XD-C-09', 'Mixed Doubles · Group C', '3', '2026-06-28', '16:20:00', 'Sakshi Chavan', 'Akshay Jagani', 'Vikas Gupta', 'Priya Gupta'),
    ('CSC-XD-C-10', 'Mixed Doubles · Group C', '3', '2026-06-28', '16:30:00', 'Neeraj Surendra Jaiswal', 'Sakshi Jaiswal', 'Sakshi Chavan', 'Akshay Jagani'),
    ('CSC-XD-D-01', 'Mixed Doubles · Group D', '4', '2026-06-28', '15:00:00', 'Harshit Kalla', 'Taruna', 'Hardik Chotalia', 'Kinjal Chotalia'),
    ('CSC-XD-D-02', 'Mixed Doubles · Group D', '4', '2026-06-28', '15:10:00', 'Rahul Bhuva', 'Kenali Shah', 'Sumit Sharma', 'Theertha'),
    ('CSC-XD-D-03', 'Mixed Doubles · Group D', '4', '2026-06-28', '15:20:00', 'Yash Chaplot', 'Parul Gupta', 'Harshit Kalla', 'Taruna'),
    ('CSC-XD-D-04', 'Mixed Doubles · Group D', '4', '2026-06-28', '15:30:00', 'Hardik Chotalia', 'Kinjal Chotalia', 'Rahul Bhuva', 'Kenali Shah'),
    ('CSC-XD-D-05', 'Mixed Doubles · Group D', '4', '2026-06-28', '15:40:00', 'Harshit Kalla', 'Taruna', 'Sumit Sharma', 'Theertha'),
    ('CSC-XD-D-06', 'Mixed Doubles · Group D', '4', '2026-06-28', '15:50:00', 'Hardik Chotalia', 'Kinjal Chotalia', 'Yash Chaplot', 'Parul Gupta'),
    ('CSC-XD-D-07', 'Mixed Doubles · Group D', '4', '2026-06-28', '16:00:00', 'Rahul Bhuva', 'Kenali Shah', 'Yash Chaplot', 'Parul Gupta'),
    ('CSC-XD-D-08', 'Mixed Doubles · Group D', '4', '2026-06-28', '16:10:00', 'Harshit Kalla', 'Taruna', 'Rahul Bhuva', 'Kenali Shah'),
    ('CSC-XD-D-09', 'Mixed Doubles · Group D', '4', '2026-06-28', '16:20:00', 'Sumit Sharma', 'Theertha', 'Yash Chaplot', 'Parul Gupta'),
    ('CSC-XD-D-10', 'Mixed Doubles · Group D', '4', '2026-06-28', '16:30:00', 'Hardik Chotalia', 'Kinjal Chotalia', 'Sumit Sharma', 'Theertha')
  ) AS v(match_no, category_key, court, match_date, match_time, a1n, a2n, b1n, b2n)
),
resolved AS (
  SELECT
    w.*,
    pa1.id AS a1_id, pa2.id AS a2_id, pb1.id AS b1_id, pb2.id AS b2_id
  FROM p
  CROSS JOIN wanted w
  LEFT JOIN LATERAL (
    SELECT x.id FROM public.tournament_participants x
    WHERE x.tournament_id = p.tournament_id
      AND lower(regexp_replace(btrim(x.player_name), '[[:space:]]+', ' ', 'g'))
        = lower(regexp_replace(btrim(w.a1n), '[[:space:]]+', ' ', 'g'))
    LIMIT 1
  ) pa1 ON true
  LEFT JOIN LATERAL (
    SELECT x.id FROM public.tournament_participants x
    WHERE x.tournament_id = p.tournament_id
      AND lower(regexp_replace(btrim(x.player_name), '[[:space:]]+', ' ', 'g'))
        = lower(regexp_replace(btrim(w.a2n), '[[:space:]]+', ' ', 'g'))
    LIMIT 1
  ) pa2 ON true
  LEFT JOIN LATERAL (
    SELECT x.id FROM public.tournament_participants x
    WHERE x.tournament_id = p.tournament_id
      AND lower(regexp_replace(btrim(x.player_name), '[[:space:]]+', ' ', 'g'))
        = lower(regexp_replace(btrim(w.b1n), '[[:space:]]+', ' ', 'g'))
    LIMIT 1
  ) pb1 ON true
  LEFT JOIN LATERAL (
    SELECT x.id FROM public.tournament_participants x
    WHERE x.tournament_id = p.tournament_id
      AND lower(regexp_replace(btrim(x.player_name), '[[:space:]]+', ' ', 'g'))
        = lower(regexp_replace(btrim(w.b2n), '[[:space:]]+', ' ', 'g'))
    LIMIT 1
  ) pb2 ON true
)
SELECT match_no, category_key, court, match_date, match_time, a1n, a2n, b1n, b2n,
  trim(both ', ' FROM concat_ws(', ',
    CASE WHEN a1_id IS NULL THEN 'a1: ' || a1n END,
    CASE WHEN a2_id IS NULL THEN 'a2: ' || a2n END,
    CASE WHEN b1_id IS NULL THEN 'b1: ' || b1n END,
    CASE WHEN pb2_id IS NULL THEN 'b2: ' || b2n END
  )) AS missing_players
FROM resolved
WHERE a1_id IS NULL OR a2_id IS NULL OR b1_id IS NULL OR pb2_id IS NULL
ORDER BY match_no;

-- ─── INSERT (run after PREVIEW returns 0 rows) ───────────────────────────────
BEGIN;

WITH p AS (
  SELECT
    'fab66efc-f0da-4d4a-a9f3-42cad5fb1f09'::uuid AS tournament_id,
    t.sport,
    NULL::uuid AS created_by
  FROM public.tournaments t
  WHERE t.id = 'fab66efc-f0da-4d4a-a9f3-42cad5fb1f09'::uuid
),
_w1 AS (
  UPDATE public.matches m SET winner_id = NULL, winner_team_id = NULL
  FROM p WHERE m.tournament_id = p.tournament_id
  RETURNING 1
),
_w2 AS (
  DELETE FROM public.tournament_brackets tb
  USING p WHERE tb.tournament_id = p.tournament_id
  RETURNING 1
),
_w3 AS (
  DELETE FROM public.matches m
  USING p
  WHERE m.tournament_id = p.tournament_id
    AND (
      m.match_number LIKE 'CSC-%'
      OR m.match_number LIKE 'RR-%'
      OR m.match_number LIKE 'B-%'
      OR m.match_number LIKE 'JCC-%'
      OR m.match_number LIKE 'DD-%'
    )
  RETURNING 1
),
parts AS (
  SELECT
    tp.id,
    tp.player_name,
    COALESCE(NULLIF(trim(tp.category), ''), '—') AS category,
    lower(regexp_replace(btrim(tp.player_name), '[[:space:]]+', ' ', 'g')) AS name_key
  FROM public.tournament_participants tp
  INNER JOIN p ON tp.tournament_id = p.tournament_id
),
ins AS (
  INSERT INTO public.matches (
    id, tournament_id, sport, match_type, status,
    match_number, match_date, court_number, notes, created_by
  )
  SELECT
    gen_random_uuid(),
    p.tournament_id,
    p.sport,
    'tournament',
    'upcoming',
    v.match_no,
    ((v.match_date::date + v.match_time::time) AT TIME ZONE 'Asia/Kolkata'),
    v.court,
    concat(
      '__JSON__',
      jsonb_build_object(
        'type', 'doubles_line',
        'categoryKey', v.category_key,
        'teamAId', 'side_a',
        'teamBId', 'side_b',
        'sideA', jsonb_build_array(
          jsonb_build_object('id', pa1.id::text, 'name', pa1.player_name, 'category', pa1.category),
          jsonb_build_object('id', pa2.id::text, 'name', pa2.player_name, 'category', pa2.category)
        ),
        'sideB', jsonb_build_array(
          jsonb_build_object('id', pb1.id::text, 'name', pb1.player_name, 'category', pb1.category),
          jsonb_build_object('id', pb2.id::text, 'name', pb2.player_name, 'category', pb2.category)
        )
      )::text
    ),
    p.created_by
  FROM p
  CROSS JOIN (
    VALUES
    ('CSC-FD-A-01', 'Females Doubles · Group A', '3', '2026-06-28', '13:30:00', 'Babita Rana', 'Parul Gupta', 'Esha Dedavat', 'Asmita Jain'),
    ('CSC-FD-A-02', 'Females Doubles · Group A', '3', '2026-06-28', '13:39:00', 'Nidhi Maskare', 'Niyati Fofadia', 'Pooja Patekar', 'Sandya Pujari'),
    ('CSC-FD-A-03', 'Females Doubles · Group A', '3', '2026-06-28', '13:48:00', 'Urvi Mota', 'Monica Pandya', 'Babita Rana', 'Parul Gupta'),
    ('CSC-FD-A-04', 'Females Doubles · Group A', '3', '2026-06-28', '13:57:00', 'Esha Dedavat', 'Asmita Jain', 'Nidhi Maskare', 'Niyati Fofadia'),
    ('CSC-FD-A-05', 'Females Doubles · Group A', '3', '2026-06-28', '14:06:00', 'Pooja Patekar', 'Sandya Pujari', 'Urvi Mota', 'Monica Pandya'),
    ('CSC-FD-A-06', 'Females Doubles · Group A', '3', '2026-06-28', '14:15:00', 'Babita Rana', 'Parul Gupta', 'Nidhi Maskare', 'Niyati Fofadia'),
    ('CSC-FD-A-07', 'Females Doubles · Group A', '3', '2026-06-28', '14:24:00', 'Esha Dedavat', 'Asmita Jain', 'Pooja Patekar', 'Sandya Pujari'),
    ('CSC-FD-A-08', 'Females Doubles · Group A', '3', '2026-06-28', '14:33:00', 'Nidhi Maskare', 'Niyati Fofadia', 'Urvi Mota', 'Monica Pandya'),
    ('CSC-FD-A-09', 'Females Doubles · Group A', '3', '2026-06-28', '14:42:00', 'Babita Rana', 'Parul Gupta', 'Pooja Patekar', 'Sandya Pujari'),
    ('CSC-FD-A-10', 'Females Doubles · Group A', '3', '2026-06-28', '14:51:00', 'Esha Dedavat', 'Asmita Jain', 'Urvi Mota', 'Monica Pandya'),
    ('CSC-FD-B-01', 'Females Doubles · Group B', '4', '2026-06-28', '13:30:00', 'Deepali Bardia', 'Taruna Vaishnav', 'Hiral Nandu', 'Archana Kumawat'),
    ('CSC-FD-B-02', 'Females Doubles · Group B', '4', '2026-06-28', '13:39:00', 'Krupa Sanghavi', 'Kenali Shah', 'Maitri Hemant Vikam', 'Dharmi Nandu'),
    ('CSC-FD-B-03', 'Females Doubles · Group B', '4', '2026-06-28', '13:48:00', 'Theertha Cp', 'Ruchita', 'Deepali Bardia', 'Taruna Vaishnav'),
    ('CSC-FD-B-04', 'Females Doubles · Group B', '4', '2026-06-28', '13:57:00', 'Hiral Nandu', 'Archana Kumawat', 'Krupa Sanghavi', 'Kenali Shah'),
    ('CSC-FD-B-05', 'Females Doubles · Group B', '4', '2026-06-28', '14:06:00', 'Maitri Hemant Vikam', 'Dharmi Nandu', 'Theertha Cp', 'Ruchita'),
    ('CSC-FD-B-06', 'Females Doubles · Group B', '4', '2026-06-28', '14:15:00', 'Deepali Bardia', 'Taruna Vaishnav', 'Krupa Sanghavi', 'Kenali Shah'),
    ('CSC-FD-B-07', 'Females Doubles · Group B', '4', '2026-06-28', '14:24:00', 'Hiral Nandu', 'Archana Kumawat', 'Maitri Hemant Vikam', 'Dharmi Nandu'),
    ('CSC-FD-B-08', 'Females Doubles · Group B', '4', '2026-06-28', '14:33:00', 'Krupa Sanghavi', 'Kenali Shah', 'Theertha Cp', 'Ruchita'),
    ('CSC-FD-B-09', 'Females Doubles · Group B', '4', '2026-06-28', '14:42:00', 'Deepali Bardia', 'Taruna Vaishnav', 'Maitri Hemant Vikam', 'Dharmi Nandu'),
    ('CSC-FD-B-10', 'Females Doubles · Group B', '4', '2026-06-28', '14:51:00', 'Hiral Nandu', 'Archana Kumawat', 'Theertha Cp', 'Ruchita'),
    ('CSC-MD-A-01', 'Mens Doubles · Group A', '1', '2026-06-28', '09:00:00', 'Krish Agarwal', 'Harsh Kansara', 'Pratik Solanki', 'Aryan Pawar'),
    ('CSC-MD-A-02', 'Mens Doubles · Group A', '1', '2026-06-28', '09:10:00', 'Sagar Aswal', 'Kamal A', 'Zaid Khandwani', 'Shreyans Kothari'),
    ('CSC-MD-A-03', 'Mens Doubles · Group A', '1', '2026-06-28', '09:20:00', 'Krish Agarwal', 'Harsh Kansara', 'Sagar Aswal', 'Kamal A'),
    ('CSC-MD-A-04', 'Mens Doubles · Group A', '1', '2026-06-28', '09:30:00', 'Pratik Solanki', 'Aryan Pawar', 'Zaid Khandwani', 'Shreyans Kothari'),
    ('CSC-MD-A-05', 'Mens Doubles · Group A', '1', '2026-06-28', '09:40:00', 'Krish Agarwal', 'Harsh Kansara', 'Zaid Khandwani', 'Shreyans Kothari'),
    ('CSC-MD-A-06', 'Mens Doubles · Group A', '1', '2026-06-28', '09:50:00', 'Pratik Solanki', 'Aryan Pawar', 'Sagar Aswal', 'Kamal A'),
    ('CSC-MD-E-01', 'Mens Doubles · Group E', '1', '2026-06-28', '10:00:00', 'Arag Daga', 'Tanishk', 'Prithviraj Todi', 'Ramesh Jain'),
    ('CSC-MD-E-02', 'Mens Doubles · Group E', '1', '2026-06-28', '10:10:00', 'Saksham Maheshwari', 'Harsh Dargar', 'Smeet Parikh', 'Sagar Parikh'),
    ('CSC-MD-E-03', 'Mens Doubles · Group E', '1', '2026-06-28', '10:20:00', 'Arag Daga', 'Tanishk', 'Saksham Maheshwari', 'Harsh Dargar'),
    ('CSC-MD-E-04', 'Mens Doubles · Group E', '1', '2026-06-28', '10:30:00', 'Prithviraj Todi', 'Ramesh Jain', 'Smeet Parikh', 'Sagar Parikh'),
    ('CSC-MD-E-05', 'Mens Doubles · Group E', '1', '2026-06-28', '10:40:00', 'Arag Daga', 'Tanishk', 'Smeet Parikh', 'Sagar Parikh'),
    ('CSC-MD-E-06', 'Mens Doubles · Group E', '1', '2026-06-28', '10:50:00', 'Prithviraj Todi', 'Ramesh Jain', 'Saksham Maheshwari', 'Harsh Dargar'),
    ('CSC-MD-I-01', 'Mens Doubles · Group I', '1', '2026-06-28', '11:00:00', 'Anish Jalui', 'Giriraj Jadeja', 'Kamal Agarwal', 'Nayan'),
    ('CSC-MD-I-02', 'Mens Doubles · Group I', '1', '2026-06-28', '11:10:00', 'Mitesh Raja', 'Karthik', 'Sumit Sharma', 'Deepak Bothra'),
    ('CSC-MD-I-03', 'Mens Doubles · Group I', '1', '2026-06-28', '11:20:00', 'Anish Jalui', 'Giriraj Jadeja', 'Mitesh Raja', 'Karthik'),
    ('CSC-MD-I-04', 'Mens Doubles · Group I', '1', '2026-06-28', '11:30:00', 'Kamal Agarwal', 'Nayan', 'Sumit Sharma', 'Deepak Bothra'),
    ('CSC-MD-I-05', 'Mens Doubles · Group I', '1', '2026-06-28', '11:40:00', 'Anish Jalui', 'Giriraj Jadeja', 'Sumit Sharma', 'Deepak Bothra'),
    ('CSC-MD-I-06', 'Mens Doubles · Group I', '1', '2026-06-28', '11:50:00', 'Kamal Agarwal', 'Nayan', 'Mitesh Raja', 'Karthik'),
    ('CSC-MD-M-01', 'Mens Doubles · Group M', '1', '2026-06-28', '12:00:00', 'Anand Jain', 'Ankit Rathi', 'Sumit Bajaj', 'Palak'),
    ('CSC-MD-M-02', 'Mens Doubles · Group M', '1', '2026-06-28', '12:10:00', 'Mohak Ishwar', 'Vinit', 'Kartil Jain', 'Mudrank Jain'),
    ('CSC-MD-M-03', 'Mens Doubles · Group M', '1', '2026-06-28', '12:20:00', 'Anand Jain', 'Ankit Rathi', 'Mohak Ishwar', 'Vinit'),
    ('CSC-MD-M-04', 'Mens Doubles · Group M', '1', '2026-06-28', '12:30:00', 'Sumit Bajaj', 'Palak', 'Kartil Jain', 'Mudrank Jain'),
    ('CSC-MD-M-05', 'Mens Doubles · Group M', '1', '2026-06-28', '12:40:00', 'Anand Jain', 'Ankit Rathi', 'Kartil Jain', 'Mudrank Jain'),
    ('CSC-MD-M-06', 'Mens Doubles · Group M', '1', '2026-06-28', '12:50:00', 'Sumit Bajaj', 'Palak', 'Mohak Ishwar', 'Vinit'),
    ('CSC-MD-B-01', 'Mens Doubles · Group B', '2', '2026-06-28', '09:00:00', 'Mehul Bhastana', 'Prerit Jain', 'Neeraj Surendra Jaiswal', 'Srikant Amarjeet Singh'),
    ('CSC-MD-B-02', 'Mens Doubles · Group B', '2', '2026-06-28', '09:10:00', 'Nikhil Agarwal', 'Neeraj Mishra', 'Piyush Laddha', 'Govind Parashar'),
    ('CSC-MD-B-03', 'Mens Doubles · Group B', '2', '2026-06-28', '09:20:00', 'Mehul Bhastana', 'Prerit Jain', 'Nikhil Agarwal', 'Neeraj Mishra'),
    ('CSC-MD-B-04', 'Mens Doubles · Group B', '2', '2026-06-28', '09:30:00', 'Neeraj Surendra Jaiswal', 'Srikant Amarjeet Singh', 'Piyush Laddha', 'Govind Parashar'),
    ('CSC-MD-B-05', 'Mens Doubles · Group B', '2', '2026-06-28', '09:40:00', 'Mehul Bhastana', 'Prerit Jain', 'Piyush Laddha', 'Govind Parashar'),
    ('CSC-MD-B-06', 'Mens Doubles · Group B', '2', '2026-06-28', '09:50:00', 'Neeraj Surendra Jaiswal', 'Srikant Amarjeet Singh', 'Nikhil Agarwal', 'Neeraj Mishra'),
    ('CSC-MD-F-01', 'Mens Doubles · Group F', '2', '2026-06-28', '10:00:00', 'Vijay Ladha', 'Rohit Jain', 'Ram Goenka', 'Venil Mehta'),
    ('CSC-MD-F-02', 'Mens Doubles · Group F', '2', '2026-06-28', '10:10:00', 'Rishabh Parekh', 'Harshit Makwana', 'Vedant Harikrishan Gupta', 'Lance'),
    ('CSC-MD-F-03', 'Mens Doubles · Group F', '2', '2026-06-28', '10:20:00', 'Vijay Ladha', 'Rohit Jain', 'Rishabh Parekh', 'Harshit Makwana'),
    ('CSC-MD-F-04', 'Mens Doubles · Group F', '2', '2026-06-28', '10:30:00', 'Ram Goenka', 'Venil Mehta', 'Vedant Harikrishan Gupta', 'Lance'),
    ('CSC-MD-F-05', 'Mens Doubles · Group F', '2', '2026-06-28', '10:40:00', 'Vijay Ladha', 'Rohit Jain', 'Vedant Harikrishan Gupta', 'Lance'),
    ('CSC-MD-F-06', 'Mens Doubles · Group F', '2', '2026-06-28', '10:50:00', 'Ram Goenka', 'Venil Mehta', 'Rishabh Parekh', 'Harshit Makwana'),
    ('CSC-MD-J-01', 'Mens Doubles · Group J', '2', '2026-06-28', '11:00:00', 'Hassan Khatri', 'Siddharth Kyal', 'Rohit Nagarkar', 'Ayush Shah'),
    ('CSC-MD-J-02', 'Mens Doubles · Group J', '2', '2026-06-28', '11:10:00', 'Ronak Osthwal', 'Ganesh Koshti', 'Yash Choumal', 'CA Neeraj Mishra'),
    ('CSC-MD-J-03', 'Mens Doubles · Group J', '2', '2026-06-28', '11:20:00', 'Hassan Khatri', 'Siddharth Kyal', 'Ronak Osthwal', 'Ganesh Koshti'),
    ('CSC-MD-J-04', 'Mens Doubles · Group J', '2', '2026-06-28', '11:30:00', 'Rohit Nagarkar', 'Ayush Shah', 'Yash Choumal', 'CA Neeraj Mishra'),
    ('CSC-MD-J-05', 'Mens Doubles · Group J', '2', '2026-06-28', '11:40:00', 'Hassan Khatri', 'Siddharth Kyal', 'Yash Choumal', 'CA Neeraj Mishra'),
    ('CSC-MD-J-06', 'Mens Doubles · Group J', '2', '2026-06-28', '11:50:00', 'Rohit Nagarkar', 'Ayush Shah', 'Ronak Osthwal', 'Ganesh Koshti'),
    ('CSC-MD-C-01', 'Mens Doubles · Group C', '3', '2026-06-28', '09:00:00', 'Ajay Soni', 'Munket Soni', 'Ketan Patil', 'Rajan Tiwari'),
    ('CSC-MD-C-02', 'Mens Doubles · Group C', '3', '2026-06-28', '09:10:00', 'Mayur Tank', 'Hardik Chotalia', 'Mehul Patel', 'Parth Shrimankar'),
    ('CSC-MD-C-03', 'Mens Doubles · Group C', '3', '2026-06-28', '09:20:00', 'Ajay Soni', 'Munket Soni', 'Mayur Tank', 'Hardik Chotalia'),
    ('CSC-MD-C-04', 'Mens Doubles · Group C', '3', '2026-06-28', '09:30:00', 'Ketan Patil', 'Rajan Tiwari', 'Mehul Patel', 'Parth Shrimankar'),
    ('CSC-MD-C-05', 'Mens Doubles · Group C', '3', '2026-06-28', '09:40:00', 'Ajay Soni', 'Munket Soni', 'Mehul Patel', 'Parth Shrimankar'),
    ('CSC-MD-C-06', 'Mens Doubles · Group C', '3', '2026-06-28', '09:50:00', 'Ketan Patil', 'Rajan Tiwari', 'Mayur Tank', 'Hardik Chotalia'),
    ('CSC-MD-G-01', 'Mens Doubles · Group G', '3', '2026-06-28', '10:00:00', 'Alessan Agrawal', 'Kunal Modi', 'Harshil Shah', 'Ashok Biyani'),
    ('CSC-MD-G-02', 'Mens Doubles · Group G', '3', '2026-06-28', '10:10:00', 'Nivesh Beria', 'Parth Thathagar', 'Pravin Thanvi', 'Mohit Chothwani'),
    ('CSC-MD-G-03', 'Mens Doubles · Group G', '3', '2026-06-28', '10:20:00', 'Alessan Agrawal', 'Kunal Modi', 'Nivesh Beria', 'Parth Thathagar'),
    ('CSC-MD-G-04', 'Mens Doubles · Group G', '3', '2026-06-28', '10:30:00', 'Harshil Shah', 'Ashok Biyani', 'Pravin Thanvi', 'Mohit Chothwani'),
    ('CSC-MD-G-05', 'Mens Doubles · Group G', '3', '2026-06-28', '10:40:00', 'Alessan Agrawal', 'Kunal Modi', 'Pravin Thanvi', 'Mohit Chothwani'),
    ('CSC-MD-G-06', 'Mens Doubles · Group G', '3', '2026-06-28', '10:50:00', 'Harshil Shah', 'Ashok Biyani', 'Nivesh Beria', 'Parth Thathagar'),
    ('CSC-MD-K-01', 'Mens Doubles · Group K', '3', '2026-06-28', '11:00:00', 'Harshit Kalla', 'Yash Bansal', 'Kartik Ramesh Ladha', 'Sanyam Jain'),
    ('CSC-MD-K-02', 'Mens Doubles · Group K', '3', '2026-06-28', '11:10:00', 'Rocky Patil', 'Ronak Agarwal', 'Rohit Ningoo', 'Pratik Shinde'),
    ('CSC-MD-K-03', 'Mens Doubles · Group K', '3', '2026-06-28', '11:20:00', 'Harshit Kalla', 'Yash Bansal', 'Rocky Patil', 'Ronak Agarwal'),
    ('CSC-MD-K-04', 'Mens Doubles · Group K', '3', '2026-06-28', '11:30:00', 'Kartik Ramesh Ladha', 'Sanyam Jain', 'Rohit Ningoo', 'Pratik Shinde'),
    ('CSC-MD-K-05', 'Mens Doubles · Group K', '3', '2026-06-28', '11:40:00', 'Harshit Kalla', 'Yash Bansal', 'Rohit Ningoo', 'Pratik Shinde'),
    ('CSC-MD-K-06', 'Mens Doubles · Group K', '3', '2026-06-28', '11:50:00', 'Kartik Ramesh Ladha', 'Sanyam Jain', 'Rocky Patil', 'Ronak Agarwal'),
    ('CSC-MD-D-01', 'Mens Doubles · Group D', '4', '2026-06-28', '09:00:00', 'Jayant Mehra', 'Shonak Gupta', 'Krushabh Naik', 'Puneet Trivedi'),
    ('CSC-MD-D-02', 'Mens Doubles · Group D', '4', '2026-06-28', '09:10:00', 'Navneet Upadhyay', 'Tarun Kothari', 'Rahul Bhuva', 'Kapil Goyal'),
    ('CSC-MD-D-03', 'Mens Doubles · Group D', '4', '2026-06-28', '09:20:00', 'Jayant Mehra', 'Shonak Gupta', 'Navneet Upadhyay', 'Tarun Kothari'),
    ('CSC-MD-D-04', 'Mens Doubles · Group D', '4', '2026-06-28', '09:30:00', 'Krushabh Naik', 'Puneet Trivedi', 'Rahul Bhuva', 'Kapil Goyal'),
    ('CSC-MD-D-05', 'Mens Doubles · Group D', '4', '2026-06-28', '09:40:00', 'Jayant Mehra', 'Shonak Gupta', 'Rahul Bhuva', 'Kapil Goyal'),
    ('CSC-MD-D-06', 'Mens Doubles · Group D', '4', '2026-06-28', '09:50:00', 'Krushabh Naik', 'Puneet Trivedi', 'Navneet Upadhyay', 'Tarun Kothari'),
    ('CSC-MD-H-01', 'Mens Doubles · Group H', '4', '2026-06-28', '10:00:00', 'Bhavuk Singhal', 'Harshit Sethi', 'Mayur Mundhra', 'Aba Parab'),
    ('CSC-MD-H-02', 'Mens Doubles · Group H', '4', '2026-06-28', '10:10:00', 'Vaibhav Shah', 'Pravesh Jain', 'Vishal Joshi', 'Aditya Seth'),
    ('CSC-MD-H-03', 'Mens Doubles · Group H', '4', '2026-06-28', '10:20:00', 'Bhavuk Singhal', 'Harshit Sethi', 'Vaibhav Shah', 'Pravesh Jain'),
    ('CSC-MD-H-04', 'Mens Doubles · Group H', '4', '2026-06-28', '10:30:00', 'Mayur Mundhra', 'Aba Parab', 'Vishal Joshi', 'Aditya Seth'),
    ('CSC-MD-H-05', 'Mens Doubles · Group H', '4', '2026-06-28', '10:40:00', 'Bhavuk Singhal', 'Harshit Sethi', 'Vishal Joshi', 'Aditya Seth'),
    ('CSC-MD-H-06', 'Mens Doubles · Group H', '4', '2026-06-28', '10:50:00', 'Mayur Mundhra', 'Aba Parab', 'Vaibhav Shah', 'Pravesh Jain'),
    ('CSC-MD-L-01', 'Mens Doubles · Group L', '4', '2026-06-28', '11:00:00', 'Akash Bajaj', 'Mayank Bajaj', 'Akshay Amin', 'Vikas Gupta'),
    ('CSC-MD-L-02', 'Mens Doubles · Group L', '4', '2026-06-28', '11:10:00', 'CA Karan Parmar', 'CA Divyang Kothari', 'Morris Lopes', 'Darryl Gonsalves'),
    ('CSC-MD-L-03', 'Mens Doubles · Group L', '4', '2026-06-28', '11:20:00', 'Akash Bajaj', 'Mayank Bajaj', 'CA Karan Parmar', 'CA Divyang Kothari'),
    ('CSC-MD-L-04', 'Mens Doubles · Group L', '4', '2026-06-28', '11:30:00', 'Akshay Amin', 'Vikas Gupta', 'Morris Lopes', 'Darryl Gonsalves'),
    ('CSC-MD-L-05', 'Mens Doubles · Group L', '4', '2026-06-28', '11:40:00', 'Akash Bajaj', 'Mayank Bajaj', 'Morris Lopes', 'Darryl Gonsalves'),
    ('CSC-MD-L-06', 'Mens Doubles · Group L', '4', '2026-06-28', '11:50:00', 'Akshay Amin', 'Vikas Gupta', 'CA Karan Parmar', 'CA Divyang Kothari'),
    ('CSC-XD-A-01', 'Mixed Doubles · Group A', '1', '2026-06-28', '14:30:00', 'Akshay Amin', 'Shilpa Poojari', 'Deepali Bardia', 'Kartik Meridatta'),
    ('CSC-XD-A-02', 'Mixed Doubles · Group A', '1', '2026-06-28', '14:40:00', 'Dviti Shah', 'Manan Shah', 'Harshit Sethi', 'Babita'),
    ('CSC-XD-A-03', 'Mixed Doubles · Group A', '1', '2026-06-28', '14:50:00', 'Morris Lopes', 'Aleta Almeida', 'Akshay Amin', 'Shilpa Poojari'),
    ('CSC-XD-A-04', 'Mixed Doubles · Group A', '1', '2026-06-28', '15:00:00', 'Deepali Bardia', 'Kartik Meridatta', 'Dviti Shah', 'Manan Shah'),
    ('CSC-XD-A-05', 'Mixed Doubles · Group A', '1', '2026-06-28', '15:10:00', 'Akshay Amin', 'Shilpa Poojari', 'Harshit Sethi', 'Babita'),
    ('CSC-XD-A-06', 'Mixed Doubles · Group A', '1', '2026-06-28', '15:20:00', 'Deepali Bardia', 'Kartik Meridatta', 'Morris Lopes', 'Aleta Almeida'),
    ('CSC-XD-A-07', 'Mixed Doubles · Group A', '1', '2026-06-28', '15:30:00', 'Dviti Shah', 'Manan Shah', 'Morris Lopes', 'Aleta Almeida'),
    ('CSC-XD-A-08', 'Mixed Doubles · Group A', '1', '2026-06-28', '15:40:00', 'Akshay Amin', 'Shilpa Poojari', 'Dviti Shah', 'Manan Shah'),
    ('CSC-XD-A-09', 'Mixed Doubles · Group A', '1', '2026-06-28', '15:50:00', 'Harshit Sethi', 'Babita', 'Morris Lopes', 'Aleta Almeida'),
    ('CSC-XD-A-10', 'Mixed Doubles · Group A', '1', '2026-06-28', '16:00:00', 'Deepali Bardia', 'Kartik Meridatta', 'Harshit Sethi', 'Babita'),
    ('CSC-XD-B-01', 'Mixed Doubles · Group B', '2', '2026-06-28', '14:30:00', 'Aashi Mour', 'Rishabh Parekh', 'Arag Daga', 'Rakshita'),
    ('CSC-XD-B-02', 'Mixed Doubles · Group B', '2', '2026-06-28', '14:40:00', 'Archana Kumawat', 'CA Ashish Mishra', 'Prerit Mehta', 'Urvi Mota'),
    ('CSC-XD-B-03', 'Mixed Doubles · Group B', '2', '2026-06-28', '14:50:00', 'Maitri Hemant Vikam', 'Vaibhav Shah', 'Aashi Mour', 'Rishabh Parekh'),
    ('CSC-XD-B-04', 'Mixed Doubles · Group B', '2', '2026-06-28', '15:00:00', 'Arag Daga', 'Rakshita', 'Archana Kumawat', 'CA Ashish Mishra'),
    ('CSC-XD-B-05', 'Mixed Doubles · Group B', '2', '2026-06-28', '15:10:00', 'Aashi Mour', 'Rishabh Parekh', 'Prerit Mehta', 'Urvi Mota'),
    ('CSC-XD-B-06', 'Mixed Doubles · Group B', '2', '2026-06-28', '15:20:00', 'Arag Daga', 'Rakshita', 'Maitri Hemant Vikam', 'Vaibhav Shah'),
    ('CSC-XD-B-07', 'Mixed Doubles · Group B', '2', '2026-06-28', '15:30:00', 'Archana Kumawat', 'CA Ashish Mishra', 'Maitri Hemant Vikam', 'Vaibhav Shah'),
    ('CSC-XD-B-08', 'Mixed Doubles · Group B', '2', '2026-06-28', '15:40:00', 'Aashi Mour', 'Rishabh Parekh', 'Archana Kumawat', 'CA Ashish Mishra'),
    ('CSC-XD-B-09', 'Mixed Doubles · Group B', '2', '2026-06-28', '15:50:00', 'Prerit Mehta', 'Urvi Mota', 'Maitri Hemant Vikam', 'Vaibhav Shah'),
    ('CSC-XD-B-10', 'Mixed Doubles · Group B', '2', '2026-06-28', '16:00:00', 'Arag Daga', 'Rakshita', 'Prerit Mehta', 'Urvi Mota'),
    ('CSC-XD-C-01', 'Mixed Doubles · Group C', '3', '2026-06-28', '15:00:00', 'Esha Dedavat', 'Akshan Agrawal', 'Neeraj Surendra Jaiswal', 'Sakshi Jaiswal'),
    ('CSC-XD-C-02', 'Mixed Doubles · Group C', '3', '2026-06-28', '15:10:00', 'Sagar Aswal', 'Harshita Kalla', 'Sakshi Chavan', 'Akshay Jagani'),
    ('CSC-XD-C-03', 'Mixed Doubles · Group C', '3', '2026-06-28', '15:20:00', 'Vikas Gupta', 'Priya Gupta', 'Esha Dedavat', 'Akshan Agrawal'),
    ('CSC-XD-C-04', 'Mixed Doubles · Group C', '3', '2026-06-28', '15:30:00', 'Neeraj Surendra Jaiswal', 'Sakshi Jaiswal', 'Sagar Aswal', 'Harshita Kalla'),
    ('CSC-XD-C-05', 'Mixed Doubles · Group C', '3', '2026-06-28', '15:40:00', 'Esha Dedavat', 'Akshan Agrawal', 'Sakshi Chavan', 'Akshay Jagani'),
    ('CSC-XD-C-06', 'Mixed Doubles · Group C', '3', '2026-06-28', '15:50:00', 'Neeraj Surendra Jaiswal', 'Sakshi Jaiswal', 'Vikas Gupta', 'Priya Gupta'),
    ('CSC-XD-C-07', 'Mixed Doubles · Group C', '3', '2026-06-28', '16:00:00', 'Sagar Aswal', 'Harshita Kalla', 'Vikas Gupta', 'Priya Gupta'),
    ('CSC-XD-C-08', 'Mixed Doubles · Group C', '3', '2026-06-28', '16:10:00', 'Esha Dedavat', 'Akshan Agrawal', 'Sagar Aswal', 'Harshita Kalla'),
    ('CSC-XD-C-09', 'Mixed Doubles · Group C', '3', '2026-06-28', '16:20:00', 'Sakshi Chavan', 'Akshay Jagani', 'Vikas Gupta', 'Priya Gupta'),
    ('CSC-XD-C-10', 'Mixed Doubles · Group C', '3', '2026-06-28', '16:30:00', 'Neeraj Surendra Jaiswal', 'Sakshi Jaiswal', 'Sakshi Chavan', 'Akshay Jagani'),
    ('CSC-XD-D-01', 'Mixed Doubles · Group D', '4', '2026-06-28', '15:00:00', 'Harshit Kalla', 'Taruna', 'Hardik Chotalia', 'Kinjal Chotalia'),
    ('CSC-XD-D-02', 'Mixed Doubles · Group D', '4', '2026-06-28', '15:10:00', 'Rahul Bhuva', 'Kenali Shah', 'Sumit Sharma', 'Theertha'),
    ('CSC-XD-D-03', 'Mixed Doubles · Group D', '4', '2026-06-28', '15:20:00', 'Yash Chaplot', 'Parul Gupta', 'Harshit Kalla', 'Taruna'),
    ('CSC-XD-D-04', 'Mixed Doubles · Group D', '4', '2026-06-28', '15:30:00', 'Hardik Chotalia', 'Kinjal Chotalia', 'Rahul Bhuva', 'Kenali Shah'),
    ('CSC-XD-D-05', 'Mixed Doubles · Group D', '4', '2026-06-28', '15:40:00', 'Harshit Kalla', 'Taruna', 'Sumit Sharma', 'Theertha'),
    ('CSC-XD-D-06', 'Mixed Doubles · Group D', '4', '2026-06-28', '15:50:00', 'Hardik Chotalia', 'Kinjal Chotalia', 'Yash Chaplot', 'Parul Gupta'),
    ('CSC-XD-D-07', 'Mixed Doubles · Group D', '4', '2026-06-28', '16:00:00', 'Rahul Bhuva', 'Kenali Shah', 'Yash Chaplot', 'Parul Gupta'),
    ('CSC-XD-D-08', 'Mixed Doubles · Group D', '4', '2026-06-28', '16:10:00', 'Harshit Kalla', 'Taruna', 'Rahul Bhuva', 'Kenali Shah'),
    ('CSC-XD-D-09', 'Mixed Doubles · Group D', '4', '2026-06-28', '16:20:00', 'Sumit Sharma', 'Theertha', 'Yash Chaplot', 'Parul Gupta'),
    ('CSC-XD-D-10', 'Mixed Doubles · Group D', '4', '2026-06-28', '16:30:00', 'Hardik Chotalia', 'Kinjal Chotalia', 'Sumit Sharma', 'Theertha')
  ) AS v(match_no, category_key, court, match_date, match_time, a1n, a2n, b1n, b2n)
  INNER JOIN parts pa1 ON pa1.name_key = lower(regexp_replace(btrim(v.a1n), '[[:space:]]+', ' ', 'g'))
  INNER JOIN parts pa2 ON pa2.name_key = lower(regexp_replace(btrim(v.a2n), '[[:space:]]+', ' ', 'g'))
  INNER JOIN parts pb1 ON pb1.name_key = lower(regexp_replace(btrim(v.b1n), '[[:space:]]+', ' ', 'g'))
  INNER JOIN parts pb2 ON pb2.name_key = lower(regexp_replace(btrim(v.b2n), '[[:space:]]+', ' ', 'g'))
  RETURNING id, match_number
)
SELECT count(*) AS matches_inserted FROM ins;

COMMIT;

-- Verify (expect 138):
-- SELECT match_number, court_number, match_date, left(notes, 80)
-- FROM public.matches WHERE tournament_id = 'fab66efc-f0da-4d4a-a9f3-42cad5fb1f09'::uuid
-- ORDER BY match_date, court_number, match_number;
