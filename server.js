const http = require("http");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

loadDotEnv();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "stadium_management_project_final",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "postgres",
  options: "-c search_path=stadium_management",
});

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    if (req.method !== "GET" || url.pathname !== "/") {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const filePath = path.join(__dirname, "projemiz.html");
    const html = await fs.promises.readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[".html"] });
    res.end(html);
  } catch (error) {
    console.error(error);
    sendJson(res, error.statusCode || 500, {
      error: error.message || "Unexpected server error",
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    await pool.query("SELECT 1");
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/bootstrap") {
    const payload = await getBootstrapData();
    sendJson(res, 200, payload);
    return;
  }

  const artistMatch = url.pathname.match(/^\/api\/concerts\/([^/]+)\/artists$/);
  if (req.method === "GET" && artistMatch) {
    const payload = await getConcertArtists(artistMatch[1]);
    sendJson(res, 200, payload);
    return;
  }

  const seatMatch = url.pathname.match(/^\/api\/tickets\/([^/]+)\/seat$/);
  if (req.method === "PATCH" && seatMatch) {
    const body = await readJsonBody(req);
    const payload = await updateTicketSeat(seatMatch[1], body);
    sendJson(res, 200, payload);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/reservations") {
    const body = await readJsonBody(req);
    const payload = await createReservation(body);
    sendJson(res, 201, payload);
    return;
  }

  const deleteMatch = url.pathname.match(/^\/api\/concerts\/([^/]+)$/);
  if (req.method === "DELETE" && deleteMatch) {
    const payload = await deleteConcert(deleteMatch[1]);
    sendJson(res, 200, payload);
    return;
  }

  sendJson(res, 404, { error: "API endpoint not found" });
}

async function getBootstrapData() {
  const [stats, concerts, sales, tickets, reservations] = await Promise.all([
    getStats(),
    getConcertList(),
    getSalesReport(),
    getTicketList(),
    getReservationList(),
  ]);

  return { stats, concerts, sales, tickets, reservations };
}

async function getStats() {
  const query = `
    SELECT
      (SELECT COUNT(*)::int FROM events) AS total_events,
      (SELECT COUNT(*)::int FROM concert_artists) AS total_concert_artists,
      (
        SELECT COUNT(DISTINCT pt.payment_id)::int
        FROM tickets t
        JOIN payment_tickets pt ON pt.ticket_id = t.ticket_id
        WHERE t.ticket_status = 'Reserved'
      ) AS open_reservations,
      (
        SELECT COUNT(*)::int
        FROM (
          SELECT payment_id
          FROM payment_tickets
          GROUP BY payment_id
          HAVING COUNT(*) > 1
        ) grouped
      ) AS grouped_payments
  `;
  const { rows } = await pool.query(query);
  return rows[0];
}

async function getConcertList() {
  const query = `
    SELECT
      e.event_id AS id,
      e.event_name AS name,
      e.event_date::text AS date,
      COUNT(t.ticket_id)::int AS "ticketCount"
    FROM events e
    JOIN concert_event_details ced ON ced.event_id = e.event_id
    LEFT JOIN tickets t ON t.event_id = e.event_id
    GROUP BY e.event_id, e.event_name, e.event_date
    ORDER BY e.event_date, e.event_id
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function getConcertArtists(eventId) {
  const query = `
    SELECT
      a.artist_id AS id,
      a.artist_name AS name,
      ca.performance_role AS role,
      a.genre
    FROM concert_artists ca
    JOIN artists a ON a.artist_id = ca.artist_id
    WHERE ca.event_id = $1
    ORDER BY ca.performance_order, a.artist_id
  `;
  const { rows } = await pool.query(query, [eventId]);
  return rows;
}

async function getSalesReport() {
  const query = `
    SELECT
      e.employee_id AS id,
      e.employee_first_name || ' ' || e.employee_last_name AS name,
      ev.event_name AS event,
      ev.event_type AS type,
      COUNT(t.ticket_id)::int AS sold
    FROM tickets t
    JOIN employees e ON e.employee_id = t.employee_id
    JOIN events ev ON ev.event_id = t.event_id
    GROUP BY e.employee_id, e.employee_first_name, e.employee_last_name, ev.event_name, ev.event_type
    ORDER BY ev.event_date, ev.event_name, name
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function getTicketList() {
  const query = `
    SELECT
      t.ticket_id AS id,
      c.customer_first_name || ' ' || c.customer_last_name AS customer,
      e.event_name AS event,
      s.section_name AS section,
      st.row_number AS row,
      st.seat_number::text AS seat
    FROM tickets t
    JOIN customers c ON c.customer_id = t.customer_id
    JOIN events e ON e.event_id = t.event_id
    LEFT JOIN seats st ON st.seat_id = t.seat_id
    LEFT JOIN sections s ON s.section_id = st.section_id
    ORDER BY t.ticket_id
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function getReservationList() {
  const query = `
    SELECT
      p.payment_id AS id,
      c.customer_first_name || ' ' || c.customer_last_name AS customer,
      e.event_name AS event,
      COUNT(t.ticket_id)::int AS tickets,
      p.payment_id AS "paymentId",
      CASE
        WHEN BOOL_OR(t.ticket_status = 'Reserved') THEN 'Pending'
        ELSE 'Confirmed'
      END AS status
    FROM payments p
    JOIN customers c ON c.customer_id = p.customer_id
    JOIN payment_tickets pt ON pt.payment_id = p.payment_id
    JOIN tickets t ON t.ticket_id = pt.ticket_id
    JOIN events e ON e.event_id = t.event_id
    GROUP BY p.payment_id, c.customer_first_name, c.customer_last_name, e.event_name
    ORDER BY p.payment_id DESC
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function updateTicketSeat(ticketId, body) {
  const sectionName = String(body.sectionName || "").trim();
  const rowNumber = String(body.rowNumber || "").trim();
  const seatNumber = Number(body.seatNumber);

  if (!sectionName || !rowNumber || !Number.isInteger(seatNumber)) {
    throw createHttpError(400, "Section, row, and numeric seat are required.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ticketResult = await client.query(
      "SELECT ticket_id, seat_id FROM tickets WHERE ticket_id = $1",
      [ticketId]
    );
    if (!ticketResult.rowCount) {
      throw createHttpError(404, "Ticket not found.");
    }

    const existingSection = await client.query(
      "SELECT section_id FROM sections WHERE section_name = $1 ORDER BY section_id LIMIT 1",
      [sectionName]
    );
    let sectionId;
    if (existingSection.rowCount) {
      sectionId = existingSection.rows[0].section_id;
    } else {
      const inserted = await client.query(
        `
          INSERT INTO sections (section_name, floor_number, gate_number, section_type)
          VALUES ($1, 1, 'G1', 'Seated')
          RETURNING section_id
        `,
        [sectionName]
      );
      sectionId = inserted.rows[0].section_id;
    }

    const existingSeat = await client.query(
      `
        SELECT seat_id
        FROM seats
        WHERE section_id = $1 AND row_number = $2 AND seat_number = $3
      `,
      [sectionId, rowNumber, seatNumber]
    );
    let seatId;
    if (existingSeat.rowCount) {
      seatId = existingSeat.rows[0].seat_id;
    } else {
      const insertedSeat = await client.query(
        `
          INSERT INTO seats (section_id, row_number, seat_number)
          VALUES ($1, $2, $3)
          RETURNING seat_id
        `,
        [sectionId, rowNumber, seatNumber]
      );
      seatId = insertedSeat.rows[0].seat_id;
    }

    await client.query(
      "UPDATE tickets SET seat_id = $1 WHERE ticket_id = $2",
      [seatId, ticketId]
    );

    await client.query("COMMIT");
    return { ok: true, ticketId, seat: `${sectionName}-${rowNumber}-${seatNumber}` };
  } catch (error) {
    await client.query("ROLLBACK");
    throw normalizePgError(error);
  } finally {
    client.release();
  }
}

async function createReservation(body) {
  const customerName = String(body.customerName || "").trim();
  const eventId = String(body.eventId || "").trim();
  const ticketQty = Math.max(1, Number(body.ticketQty || 1));
  const paymentMethod = String(body.paymentMethod || "").trim() || "Credit Card";
  const sectionName = String(body.sectionName || "").trim();
  const rowNumber = String(body.rowNumber || "").trim();
  const startingSeatRaw = body.startingSeat;

  if (!customerName || !eventId || !Number.isInteger(ticketQty)) {
    throw createHttpError(400, "Customer, event, and ticket quantity are required.");
  }

  const [firstName, ...rest] = customerName.split(/\s+/);
  const lastName = rest.join(" ") || "Customer";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const eventResult = await client.query(
      "SELECT event_id, event_name FROM events WHERE event_id = $1",
      [eventId]
    );
    if (!eventResult.rowCount) {
      throw createHttpError(404, "Event not found.");
    }

    const customerId = await nextId(client, "customers", "customer_id", "C", 3);
    await client.query(
      `
        INSERT INTO customers (
          customer_id, customer_first_name, customer_last_name, customer_email, customer_phone
        ) VALUES ($1, $2, $3, $4, $5)
      `,
      [
        customerId,
        firstName,
        lastName,
        `${customerId.toLowerCase()}@example.com`,
        "555-9999",
      ]
    );

    const paymentId = await nextId(client, "payments", "payment_id", "P", 4);
    await client.query(
      `
        INSERT INTO payments (
          payment_id, customer_id, payment_method, payment_status, amount_paid, currency
        ) VALUES ($1, $2, $3, 'Pending', $4, 'TRY')
      `,
      [paymentId, customerId, paymentMethod, ticketQty * 2400]
    );

    const employeeResult = await client.query(
      "SELECT employee_id FROM employees ORDER BY employee_id LIMIT 1"
    );
    const employeeId = employeeResult.rows[0].employee_id;

    let sectionId = null;
    if (sectionName && rowNumber && /^\d+$/.test(String(startingSeatRaw || ""))) {
      const sectionResult = await client.query(
        "SELECT section_id FROM sections WHERE section_name = $1 ORDER BY section_id LIMIT 1",
        [sectionName]
      );

      if (sectionResult.rowCount) {
        sectionId = sectionResult.rows[0].section_id;
      } else {
        const createdSection = await client.query(
          `
            INSERT INTO sections (section_name, floor_number, gate_number, section_type)
            VALUES ($1, 1, 'G1', 'Seated')
            RETURNING section_id
          `,
          [sectionName]
        );
        sectionId = createdSection.rows[0].section_id;
      }
    }

    const startingSeat = Number(startingSeatRaw);
    for (let i = 0; i < ticketQty; i += 1) {
      const ticketId = await nextId(client, "tickets", "ticket_id", "T", 4);
      let seatId = null;

      if (sectionId && Number.isInteger(startingSeat)) {
        const seatNumber = startingSeat + i;
        const seatResult = await client.query(
          `
            INSERT INTO seats (section_id, row_number, seat_number)
            VALUES ($1, $2, $3)
            ON CONFLICT (section_id, row_number, seat_number)
            DO UPDATE SET row_number = EXCLUDED.row_number
            RETURNING seat_id
          `,
          [sectionId, rowNumber, seatNumber]
        );
        seatId = seatResult.rows[0].seat_id;
      }

      await client.query(
        `
          INSERT INTO tickets (
            ticket_id, customer_id, event_id, seat_id, employee_id, ticket_type, ticket_status,
            ticket_price, purchase_date, purchase_time, sale_channel, booking_reference, notes
          ) VALUES (
            $1, $2, $3, $4, $5, 'Standard', 'Reserved', 2400,
            CURRENT_DATE, CURRENT_TIME, 'Website', $6, 'Created from UI reservation form'
          )
        `,
        [ticketId, customerId, eventId, seatId, employeeId, `BR-${Date.now()}-${i}`]
      );

      await client.query(
        "INSERT INTO payment_tickets (payment_id, ticket_id) VALUES ($1, $2)",
        [paymentId, ticketId]
      );
    }

    await client.query("COMMIT");

    return {
      ok: true,
      reservationId: paymentId,
      paymentId,
      customer: customerName,
      event: eventResult.rows[0].event_name,
      tickets: ticketQty,
      status: "Pending",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw normalizePgError(error);
  } finally {
    client.release();
  }
}

async function deleteConcert(eventId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        DELETE FROM events
        WHERE event_id = $1
          AND event_id IN (SELECT event_id FROM concert_event_details)
        RETURNING event_name
      `,
      [eventId]
    );

    if (!result.rowCount) {
      throw createHttpError(404, "Concert not found.");
    }

    await client.query(`
      DELETE FROM payments p
      WHERE NOT EXISTS (
        SELECT 1
        FROM payment_tickets pt
        WHERE pt.payment_id = p.payment_id
      )
    `);

    await client.query("COMMIT");
    return { ok: true, deletedEventName: result.rows[0].event_name };
  } catch (error) {
    await client.query("ROLLBACK");
    throw normalizePgError(error);
  } finally {
    client.release();
  }
}

async function nextId(client, tableName, columnName, prefix, pad) {
  const query = `
    SELECT COALESCE(MAX(CAST(SUBSTRING(${columnName} FROM '[0-9]+$') AS INT)), 0) + 1 AS next_value
    FROM ${tableName}
    WHERE ${columnName} LIKE $1
  `;
  const { rows } = await client.query(query, [`${prefix}%`]);
  return `${prefix}${String(rows[0].next_value).padStart(pad, "0")}`;
}

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) {
      continue;
    }
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": mimeTypes[".json"],
  });
  res.end(JSON.stringify(payload));
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizePgError(error) {
  if (error.statusCode) {
    return error;
  }

  if (error && error.code === "23505") {
    return createHttpError(409, "That operation conflicts with an existing record.");
  }

  return error;
}

process.on("unhandledRejection", (error) => {
  console.error(error);
});
