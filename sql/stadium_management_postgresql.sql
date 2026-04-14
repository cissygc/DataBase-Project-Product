DROP SCHEMA IF EXISTS stadium_management CASCADE;
CREATE SCHEMA stadium_management;
SET search_path TO stadium_management;

CREATE TABLE customers (
    customer_id VARCHAR(10) PRIMARY KEY,
    customer_first_name VARCHAR(50) NOT NULL,
    customer_last_name VARCHAR(50) NOT NULL,
    customer_email VARCHAR(100) NOT NULL UNIQUE,
    customer_phone VARCHAR(20) NOT NULL
);

CREATE TABLE employees (
    employee_id VARCHAR(10) PRIMARY KEY,
    employee_first_name VARCHAR(50) NOT NULL,
    employee_last_name VARCHAR(50) NOT NULL,
    employee_role VARCHAR(50) NOT NULL,
    employee_phone VARCHAR(20) NOT NULL
);

CREATE TABLE teams (
    team_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE artists (
    artist_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    artist_name VARCHAR(100) NOT NULL UNIQUE,
    genre VARCHAR(50) NOT NULL DEFAULT 'Unknown'
);

CREATE TABLE events (
    event_id VARCHAR(10) PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('Football Match', 'Concert')),
    event_date DATE NOT NULL,
    event_time TIME NOT NULL
);

CREATE TABLE football_event_details (
    event_id VARCHAR(10) PRIMARY KEY REFERENCES events(event_id) ON DELETE CASCADE,
    home_team_id INT NOT NULL REFERENCES teams(team_id),
    away_team_id INT NOT NULL REFERENCES teams(team_id),
    CHECK (home_team_id <> away_team_id)
);

CREATE TABLE concert_event_details (
    event_id VARCHAR(10) PRIMARY KEY REFERENCES events(event_id) ON DELETE CASCADE
);

CREATE TABLE concert_artists (
    event_id VARCHAR(10) NOT NULL REFERENCES concert_event_details(event_id) ON DELETE CASCADE,
    artist_id INT NOT NULL REFERENCES artists(artist_id),
    performance_order INT NOT NULL,
    performance_role VARCHAR(30) NOT NULL DEFAULT 'Main Act'
        CHECK (performance_role IN ('Main Act', 'Opening Act', 'Guest')),
    PRIMARY KEY (event_id, artist_id),
    UNIQUE (event_id, performance_order)
);

CREATE TABLE sections (
    section_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    section_name VARCHAR(50) NOT NULL,
    floor_number INT NOT NULL,
    gate_number VARCHAR(10) NOT NULL,
    section_type VARCHAR(20) NOT NULL DEFAULT 'Seated'
        CHECK (section_type IN ('Seated', 'Standing')),
    UNIQUE (section_name, floor_number, gate_number)
);

CREATE TABLE seats (
    seat_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    section_id INT NOT NULL REFERENCES sections(section_id) ON DELETE CASCADE,
    row_number VARCHAR(10) NOT NULL,
    seat_number INT NOT NULL,
    UNIQUE (section_id, row_number, seat_number)
);

CREATE TABLE tickets (
    ticket_id VARCHAR(10) PRIMARY KEY,
    customer_id VARCHAR(10) NOT NULL REFERENCES customers(customer_id),
    event_id VARCHAR(10) NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    seat_id INT NULL REFERENCES seats(seat_id),
    employee_id VARCHAR(10) NOT NULL REFERENCES employees(employee_id),
    ticket_type VARCHAR(20) NOT NULL,
    ticket_status VARCHAR(20) NOT NULL CHECK (ticket_status IN ('Paid', 'Reserved', 'Cancelled')),
    ticket_price NUMERIC(10,2) NOT NULL,
    purchase_date DATE NOT NULL,
    purchase_time TIME NOT NULL,
    sale_channel VARCHAR(30) NOT NULL,
    booking_reference VARCHAR(30) NOT NULL UNIQUE,
    notes VARCHAR(255),
    UNIQUE NULLS NOT DISTINCT (event_id, seat_id)
);

CREATE TABLE payments (
    payment_id VARCHAR(10) PRIMARY KEY,
    customer_id VARCHAR(10) NOT NULL REFERENCES customers(customer_id),
    payment_method VARCHAR(30) NOT NULL,
    payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('Completed', 'Pending', 'Refunded')),
    amount_paid NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL
);

CREATE TABLE payment_tickets (
    payment_id VARCHAR(10) NOT NULL REFERENCES payments(payment_id) ON DELETE CASCADE,
    ticket_id VARCHAR(10) NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    PRIMARY KEY (payment_id, ticket_id)
);

INSERT INTO teams (team_name) VALUES
('Galatasaray'),
('Fenerbahce'),
('Besiktas'),
('Trabzonspor');

INSERT INTO employees VALUES
('EMP01', 'Merve', 'Kaya', 'Sales Agent', '555-2001'),
('EMP02', 'Can', 'Aydin', 'Box Office Clerk', '555-2002'),
('EMP03', 'Selin', 'Aksoy', 'Call Center Agent', '555-2003');

INSERT INTO customers VALUES
('C001', 'Ali', 'Yilmaz', 'ali.yilmaz@example.com', '555-1001'),
('C002', 'Zeynep', 'Demir', 'zeynep.demir@example.com', '555-1002'),
('C003', 'Emre', 'Arslan', 'emre.arslan@example.com', '555-1003'),
('C004', 'Elif', 'Kurt', 'elif.kurt@example.com', '555-1004'),
('C005', 'Burak', 'Tas', 'burak.tas@example.com', '555-1005'),
('C006', 'Deniz', 'Sahin', 'deniz.sahin@example.com', '555-1006'),
('C007', 'Ceren', 'Ozturk', 'ceren.ozturk@example.com', '555-1007'),
('C008', 'Melis', 'Yaman', 'melis.yaman@example.com', '555-1008'),
('C009', 'Okan', 'Celik', 'okan.celik@example.com', '555-1009'),
('C010', 'Seda', 'Eren', 'seda.eren@example.com', '555-1010'),
('C011', 'Hakan', 'Kilic', 'hakan.kilic@example.com', '555-1011'),
('C012', 'Naz', 'Acar', 'naz.acar@example.com', '555-1012');

INSERT INTO artists (artist_name, genre) VALUES
('Duman', 'Rock'),
('Manga', 'Alternative Rock'),
('Tarkan', 'Pop'),
('Zeynep Bastik', 'Pop'),
('Ceza', 'Rap');

INSERT INTO events VALUES
('E2001', 'Galatasaray vs Fenerbahce', 'Football Match', '2026-04-10', '20:00:00'),
('E2002', 'Duman Live in Stadium', 'Concert', '2026-05-05', '21:00:00'),
('E2003', 'Besiktas vs Trabzonspor', 'Football Match', '2026-04-18', '19:30:00'),
('E2004', 'Tarkan Summer Night', 'Concert', '2026-06-12', '21:30:00'),
('E2005', 'Istanbul Sound Clash', 'Concert', '2026-07-01', '20:30:00');

INSERT INTO football_event_details VALUES
('E2001', 1, 2),
('E2003', 3, 4);

INSERT INTO concert_event_details VALUES
('E2002'),
('E2004'),
('E2005');

INSERT INTO concert_artists VALUES
('E2002', 1, 1, 'Main Act'),
('E2002', 2, 2, 'Opening Act'),
('E2004', 3, 1, 'Main Act'),
('E2004', 4, 2, 'Guest'),
('E2005', 5, 1, 'Main Act'),
('E2005', 2, 2, 'Guest');

INSERT INTO sections (section_name, floor_number, gate_number, section_type) VALUES
('North VIP', 1, 'G1', 'Seated'),
('East Stand', 2, 'G3', 'Seated'),
('South Premium', 1, 'G2', 'Seated'),
('West Stand', 2, 'G4', 'Seated'),
('Floor', 1, 'G5', 'Standing');

INSERT INTO seats (section_id, row_number, seat_number) VALUES
(1, 'A', 1),
(2, 'B', 15),
(2, 'B', 16),
(3, 'C', 8),
(4, 'D', 22),
(1, 'A', 2),
(4, 'E', 10),
(3, 'C', 9),
(2, 'F', 12),
(2, 'B', 17),
(3, 'C', 10),
(4, 'D', 23);

INSERT INTO payments VALUES
('P3001', 'C001', 'Credit Card', 'Completed', 1500.00, 'TRY'),
('P3002', 'C002', 'Debit Card', 'Completed', 750.00, 'TRY'),
('P3003', 'C003', 'Bank Transfer', 'Pending', 750.00, 'TRY'),
('P3004', 'C004', 'Credit Card', 'Completed', 1200.00, 'TRY'),
('P3005', 'C005', 'Cash', 'Completed', 680.00, 'TRY'),
('P3006', 'C006', 'Credit Card', 'Completed', 1100.00, 'TRY'),
('P3007', 'C007', 'Credit Card', 'Refunded', 620.00, 'TRY'),
('P3008', 'C008', 'Credit Card', 'Completed', 1350.00, 'TRY'),
('P3009', 'C009', 'Debit Card', 'Completed', 700.00, 'TRY'),
('P3010', 'C010', 'Credit Card', 'Completed', 760.00, 'TRY'),
('P3011', 'C011', 'Debit Card', 'Completed', 950.00, 'TRY'),
('P3012', 'C012', 'Credit Card', 'Completed', 690.00, 'TRY'),
('P3013', 'C001', 'Credit Card', 'Completed', 3000.00, 'TRY'),
('P3014', 'C004', 'Credit Card', 'Pending', 2400.00, 'TRY');

INSERT INTO tickets VALUES
('T1001', 'C001', 'E2001', 1,  'EMP01', 'VIP',      'Paid',      1500.00, '2026-03-01', '10:15:00', 'Website',     'BR-2026-0001', 'Early bird purchase'),
('T1002', 'C002', 'E2001', 2,  'EMP02', 'Standard', 'Paid',       750.00, '2026-03-02', '11:05:00', 'Mobile App',  'BR-2026-0002', 'Purchased with seat selection'),
('T1003', 'C003', 'E2001', 3,  'EMP02', 'Standard', 'Reserved',   750.00, '2026-03-03', '14:20:00', 'Website',     'BR-2026-0003', 'Reservation pending payment'),
('T1004', 'C004', 'E2002', 4,  'EMP01', 'Premium',  'Paid',      1200.00, '2026-03-04', '09:50:00', 'Website',     'BR-2026-0004', 'Concert package ticket'),
('T1005', 'C005', 'E2002', 5,  'EMP03', 'Standard', 'Paid',       680.00, '2026-03-05', '16:35:00', 'Call Center', 'BR-2026-0005', 'Cash payment at stadium office'),
('T1006', 'C006', 'E2003', 6,  'EMP01', 'VIP',      'Paid',      1100.00, '2026-03-06', '13:10:00', 'Mobile App',  'BR-2026-0006', 'High demand fixture'),
('T1007', 'C007', 'E2003', 7,  'EMP02', 'Standard', 'Cancelled',  620.00, '2026-03-07', '12:40:00', 'Website',     'BR-2026-0007', 'Customer requested cancellation'),
('T1008', 'C008', 'E2004', 8,  'EMP03', 'Premium',  'Paid',      1350.00, '2026-03-08', '18:05:00', 'Mobile App',  'BR-2026-0008', 'VIP lounge access included'),
('T1009', 'C009', 'E2004', 9,  'EMP02', 'Standard', 'Paid',       700.00, '2026-03-09', '20:25:00', 'Website',     'BR-2026-0009', 'Standard concert seat'),
('T1010', 'C010', 'E2001', 10, 'EMP01', 'Standard', 'Paid',       760.00, '2026-03-10', '10:45:00', 'Website',     'BR-2026-0010', 'Last seat in row'),
('T1011', 'C011', 'E2003', 11, 'EMP03', 'Premium',  'Paid',       950.00, '2026-03-11', '15:15:00', 'Call Center', 'BR-2026-0011', 'Premium football seat'),
('T1012', 'C012', 'E2002', 12, 'EMP01', 'Standard', 'Paid',       690.00, '2026-03-12', '17:30:00', 'Mobile App',  'BR-2026-0012', 'Mobile ticket delivery'),
('T1013', 'C001', 'E2002', NULL, 'EMP01', 'Standard', 'Paid',    1500.00, '2026-03-13', '12:15:00', 'Website',     'BR-2026-0013', 'Grouped payment ticket 1'),
('T1014', 'C001', 'E2002', NULL, 'EMP01', 'Standard', 'Paid',    1500.00, '2026-03-13', '12:15:00', 'Website',     'BR-2026-0014', 'Grouped payment ticket 2'),
('T1015', 'C004', 'E2004', NULL, 'EMP02', 'Standard', 'Reserved', 1200.00, '2026-03-14', '09:00:00', 'Website',     'BR-2026-0015', 'Reserved pair ticket 1'),
('T1016', 'C004', 'E2004', NULL, 'EMP02', 'Standard', 'Reserved', 1200.00, '2026-03-14', '09:00:00', 'Website',     'BR-2026-0016', 'Reserved pair ticket 2');

INSERT INTO payment_tickets VALUES
('P3001', 'T1001'),
('P3002', 'T1002'),
('P3003', 'T1003'),
('P3004', 'T1004'),
('P3005', 'T1005'),
('P3006', 'T1006'),
('P3007', 'T1007'),
('P3008', 'T1008'),
('P3009', 'T1009'),
('P3010', 'T1010'),
('P3011', 'T1011'),
('P3012', 'T1012'),
('P3013', 'T1013'),
('P3013', 'T1014'),
('P3014', 'T1015'),
('P3014', 'T1016');
