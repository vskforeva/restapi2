const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// Настройки подключения к PostgreSQL
const pool = new Pool({
  user: 'voluser',        // имя пользователя PostgreSQL
  host: 'localhost',
  database: 'volunteerdb',
  password: '1234',       // пароль пользователя
  port: 5432
});

// Включаем CORS для всех источников (можно настроить origin при необходимости)
app.use(cors());

// Позволяет Express автоматически парсить JSON в теле запросов
app.use(express.json());

// Обработчик ошибок для асинхронных функций
function asyncHandler(fn) {
  return function(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});

// Получить список всех волонтёров
app.get('/volunteers', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM volunteers');
  res.json(result.rows);
}));

// Получить волонтёра по ID
app.get('/volunteers/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM volunteers WHERE vol_id = $1', [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Волонтёр не найден' });
  }
  res.json(result.rows[0]);
}));

// Добавить нового волонтёра
app.post('/volunteers', asyncHandler(async (req, res) => {
  const { name, email, phone, skills } = req.body;
  const result = await pool.query(
    'INSERT INTO volunteers(name, email, phone, skills) VALUES($1, $2, $3, $4) RETURNING *',
    [name, email, phone, skills]
  );
  res.status(201).json(result.rows[0]);
}));

// Обновить информацию о волонтёре
app.put('/volunteers/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, skills } = req.body;
  const result = await pool.query(
    'UPDATE volunteers SET name=$1, email=$2, phone=$3, skills=$4 WHERE vol_id=$5 RETURNING *',
    [name, email, phone, skills, id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Волонтёр не найден' });
  }
  res.json(result.rows[0]);
}));

// Удалить волонтёра
app.delete('/volunteers/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('DELETE FROM volunteers WHERE vol_id = $1 RETURNING *', [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Волонтёр не найден' });
  }
  res.json({ message: 'Волонтёр удалён' });
}));

// Получить все события
app.get('/events', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM events');
  res.json(result.rows);
}));

// Зарегистрировать волонтёра на событие
app.post('/registrations', asyncHandler(async (req, res) => {
  const { volunteer_id, event_id } = req.body;
  const result = await pool.query(
    'INSERT INTO registrations(volunteer_id, event_id) VALUES($1, $2) RETURNING *',
    [volunteer_id, event_id]
  );

  // Получаем данные для письма
  const volResult = await pool.query('SELECT name, email FROM volunteers WHERE vol_id = $1', [volunteer_id]);
  const eventResult = await pool.query('SELECT title FROM events WHERE id = $1', [event_id]);

  const volunteer = volResult.rows[0];
  const event = eventResult.rows[0];

  if (volunteer.email) {
    const mailOptions = {
      from: 'nikitarusspl@yandex.ru',
      to: volunteer.email,
      subject: `Регистрация на мероприятие "${event.title}"`,
      text: `Здравствуйте, ${volunteer.name}! Вы успешно зарегистрированы на мероприятие "${event.title}".`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Ошибка отправки письма:', error);
      } else {
        console.log(`Письмо о регистрации отправлено ${volunteer.email}:`, info.response);
      }
    });
  }

  res.status(201).json(result.rows[0]);
}));

// Получить все регистрации
app.get('/registrations', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM registrations');
  res.json(result.rows);
}));

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Получить все мероприятия
app.get('/events', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM events');
  res.json(result.rows);
}));

// Получить мероприятие по ID
app.get('/events/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM events WHERE event_id = $1', [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Мероприятие не найдено' });
  }
  res.json(result.rows[0]);
}));

// Добавить новое мероприятие
app.post('/events', asyncHandler(async (req, res) => {
  const { title, date, location, organizer_id } = req.body;
  const result = await pool.query(
    'INSERT INTO events(title, date, location, organizer_id) VALUES($1, $2, $3, $4) RETURNING *',
    [title, date, location, organizer_id]
  );
  res.status(201).json(result.rows[0]);
}));

// Обновить мероприятие
app.put('/events/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, date, location, organizer_id } = req.body;
  const result = await pool.query(
    'UPDATE events SET title=$1, date=$2, location=$3, organizer_id=$4 WHERE id=$5 RETURNING *',
    [title, date, location, organizer_id, id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Мероприятие не найдено' });
  }
  res.json(result.rows[0]);
}));

// Удалить мероприятие
app.delete('/events/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('DELETE FROM events WHERE event_id = $1 RETURNING *', [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Мероприятие не найдено' });
  }
  res.json({ message: 'Мероприятие удалено' });
}));

app.post('/registrations', asyncHandler(async (req, res) => {
  const { volunteer_id, event_id } = req.body;

  // Проверяем, сколько уже зарегистрировано
  const countResult = await pool.query(
    'SELECT COUNT(*) FROM registrations WHERE event_id = $1',
    [event_id]
  );
  const count = parseInt(countResult.rows[0].count, 10);

  // Получаем максимальное количество участников мероприятия
  const eventResult = await pool.query(
    'SELECT max_participants FROM events WHERE event_id = $1',
    [event_id]
  );
  if (eventResult.rows.length === 0) {
    return res.status(404).json({ error: 'Мероприятие не найдено' });
  }
  const maxParticipants = eventResult.rows[0].max_participants;

  if (count >= maxParticipants) {
    return res.status(400).json({ error: 'Достигнут лимит участников' });
  }

  // Проверяем, не зарегистрирован ли уже волонтер на это мероприятие
  const existsResult = await pool.query(
    'SELECT * FROM registrations WHERE volunteer_id = $1 AND event_id = $2',
    [volunteer_id, event_id]
  );
  if (existsResult.rows.length > 0) {
    return res.status(400).json({ error: 'Волонтёр уже зарегистрирован на это мероприятие' });
  }

  const result = await pool.query(
    'INSERT INTO registrations(volunteer_id, event_id) VALUES($1, $2) RETURNING *',
    [volunteer_id, event_id]
  );
  res.status(201).json(result.rows[0]);
}));
const cron = require('node-cron');
const nodemailer = require('nodemailer');

// Настройка почтового транспорта через Яндекс SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.yandex.ru',
  port: 465,
  secure: true, // SSL
  auth: {
    user: 'nikitarusspl@yandex.ru',       
    pass: 'wlcdifemrrtkouhm'                   
  }
});

// Запуск задачи каждый день в 9 утра (по серверному времени)
cron.schedule('0 9 * * *', async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0]; // Формат YYYY-MM-DD

    // Получаем мероприятия на завтра
    const eventsResult = await pool.query(
      'SELECT event_id, name FROM events WHERE date = $1',
      [dateStr]
    );

    for (const event of eventsResult.rows) {
      // Получаем волонтеров, зарегистрированных на это мероприятие
      const volunteersResult = await pool.query(
        `SELECT v.email, v.name FROM volunteers v
         JOIN registrations r ON v.vol_id = r.volunteer_id
         WHERE r.event_id = $1`,
        [event.event_id]
      );

      for (const vol of volunteersResult.rows) {
        if (vol.email) {
          const mailOptions = {
            from: 'nikitarusspl@yandex.ru',
            to: vol.email,
            subject: `Напоминание о мероприятии "${event.name}"`,
            text: `Здравствуйте, ${vol.name}! Напоминаем, что завтра состоится мероприятие "${event.name}". Ждем вас!`
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('Ошибка отправки письма:', error);
            } else {
              console.log(`Письмо отправлено ${vol.email}:`, info.response);
            }
          });
        }
      }
    }
  } catch (err) {
    console.error('Ошибка при отправке уведомлений:', err);
  }
});

app.get('/organizers', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM organizers ORDER BY name');
  res.json(result.rows);
}));

// Получить статистику активности волонтера
app.get('/volunteers/:id/stats', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT COUNT(r.event_id) AS events_participated
     FROM registrations r
     WHERE r.volunteer_id = $1`,
    [id]
  );
  res.json(result.rows[0]);
}));

// Получить рейтинг волонтеров по количеству мероприятий
app.get('/volunteers/ranking', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT v.vol_id, v.name, COUNT(r.event_id) AS events_participated
     FROM volunteers v
     LEFT JOIN registrations r ON v.vol_id = r.volunteer_id
     GROUP BY v.vol_id
     ORDER BY events_participated DESC`
  );
  res.json(result.rows);
}));

// Получить отчёты о выполненной активности волонтёра с названием мероприятия
app.get('/reports', asyncHandler(async (req, res) => {
  const volunteer_id = req.query.volunteer_id;
  if (!volunteer_id) {
    return res.status(400).json({ error: 'volunteer_id обязателен' });
  }

  const result = await pool.query(
    `SELECT r.id, r.hours, r.report_date, r.notes, e.title AS event_title
     FROM reports r
     LEFT JOIN events e ON r.event_id = e.id
     WHERE r.volunteer_id = $1
     ORDER BY r.report_date DESC`,
    [volunteer_id]
  );
  res.json(result.rows);
}));

// Добавить новый отчёт о выполненной активности
app.post('/reports', asyncHandler(async (req, res) => {
  const { volunteer_id, event_id, hours, report_date, notes } = req.body;

  if (!volunteer_id || !event_id || !hours || !report_date) {
    return res.status(400).json({ error: 'Обязательные поля отсутствуют' });
  }

  const result = await pool.query(
    `INSERT INTO reports(volunteer_id, event_id, hours, report_date, notes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [volunteer_id, event_id, hours, report_date, notes || null]
  );

  res.status(201).json(result.rows[0]);
}));

// Удалить регистрацию волонтёра с мероприятия с отправкой уведомления
app.delete('/registrations', asyncHandler(async (req, res) => {
  const { volunteer_id, event_id } = req.body;

  if (!volunteer_id || !event_id) {
    return res.status(400).json({ error: 'volunteer_id и event_id обязательны' });
  }

  // Получаем данные волонтёра и мероприятия для письма
  const volResult = await pool.query('SELECT name, email FROM volunteers WHERE vol_id = $1', [volunteer_id]);
  const eventResult = await pool.query('SELECT title FROM events WHERE id = $1', [event_id]);

  if (volResult.rows.length === 0 || eventResult.rows.length === 0) {
    return res.status(404).json({ error: 'Волонтёр или мероприятие не найдены' });
  }

  const volunteer = volResult.rows[0];
  const event = eventResult.rows[0];

  // Удаляем регистрацию
  const delResult = await pool.query(
    'DELETE FROM registrations WHERE volunteer_id = $1 AND event_id = $2 RETURNING *',
    [volunteer_id, event_id]
  );

  if (delResult.rows.length === 0) {
    return res.status(404).json({ error: 'Регистрация не найдена' });
  }

  // Отправляем письмо об удалении с мероприятия
  if (volunteer.email) {
    const mailOptions = {
      from: 'your_yandex_email@yandex.ru',
      to: volunteer.email,
      subject: `Отмена участия в мероприятии "${event.title}"`,
      text: `Здравствуйте, ${volunteer.name}! Ваше участие в мероприятии "${event.title}" было отменено.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Ошибка отправки письма:', error);
      } else {
        console.log(`Письмо об отмене участия отправлено ${volunteer.email}:`, info.response);
      }
    });
  }

  res.json({ message: 'Регистрация удалена и волонтёр уведомлён' });
}));