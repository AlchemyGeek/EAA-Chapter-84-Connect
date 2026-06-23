INSERT INTO new_member_applications (first_name, last_name, email, eaa_number, address, city, state, zip_code, quarter_applied, processed)
VALUES ('Samantha','Papaefstathiou','stathis67@hotmail.com','TEST-REPLYALL2','123 Test St','Testville','CA','90000','Q2', false);

INSERT INTO buddy_assignments (volunteer_key_id, application_id)
SELECT 117995, id FROM new_member_applications WHERE eaa_number='TEST-REPLYALL2';