export { Hono } from 'hono';
import { HTTPException } from 'hono';  
import { PrismaClient, Prisma } from '@prisma/client';
import { sign, verify } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import axios from 'axios';

type Variables = JwtVariables;

const app = new Hono<{ Variables: Variables }>();
const prisma = new PrismaClient();

// Middleware for CORS and other headers
app.use('/*', async (c) => {
  c.res.setHeader('Access-Control-Allow-Origin', '*');
  c.res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  c.res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
});

// JWT Secret
const jwtSecret = 'mySecretKey';

// Helper function to generate JWT token
const generateToken = (userId: number): string => {
  const payload = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
  };
  return sign(payload, jwtSecret);
};

// Rate limiter middleware
class RateLimiter {
  private requestCounts: Map<string, number> = new Map();
  private readonly maxRequests: number;
  private readonly interval: number;

  constructor(maxRequests: number, interval: number) {
    this.maxRequests = maxRequests;
    this.interval = interval;

    // Periodically clear request counts older than interval
    setInterval(() => {
      this.requestCounts.clear();
    }, this.interval);
  }

  middleware = async (c) => {
    const key = c.req.ip; // Use IP address as key (can be improved for authenticated users)

    if (!this.requestCounts.has(key)) {
      this.requestCounts.set(key, 1);
    } else {
      const count = this.requestCounts.get(key) + 1;
      this.requestCounts.set(key, count);

      if (count > this.maxRequests) {
        throw new HTTPException(429, { message: 'Too Many Requests' });
      }
    }

    await c.next();
  };
}

const rateLimiter = new RateLimiter(100, 60000); // Allow 100 requests per minute
app.use('/*', rateLimiter.middleware);

// Register endpoint
app.post('/register', async (c) => {
  const body = await c.req.json();
  const { email, password } = body;

  const hashedPassword = await bcrypt.hash(password, 10); // bcrypt hashing

  try {
    const newUser = await prisma.user.create({
      data: {
        email,
        hashedPassword,
      },
    });
    return c.json({ message: `${newUser.email} created successfully` });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return c.json({ message: 'Email already exists' }, 400);
    } else {
      throw new HTTPException(500, { message: 'Internal Server Error' });
    }
  }
});

// Login endpoint
app.post('/login', async (c) => {
  const body = await c.req.json();
  const { email, password } = body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, hashedPassword: true },
    });

    if (!user) {
      return c.json({ message: 'User not found' }, 404);
    }

    const match = await bcrypt.compare(password, user.hashedPassword);

    if (match) {
      const token = generateToken(user.id);
      return c.json({ message: 'Login successful', token });
    } else {
      throw new HTTPException(401, { message: 'Invalid credentials' });
    }
  } catch (error) {
    throw new HTTPException(500, { message: 'Internal Server Error' });
  }
});

// Fetch Pokemon Data from PokeAPI endpoint
app.get('/pokemon/:name', async (c) => {
  const { name } = c.req.param();

  try {
    const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${name}`);
    return c.json({ data: response.data });
  } catch (error) {
    return c.json({ message: 'Pokemon not found' }, 404);
  }
});

// Protected routes middleware for JWT authentication
app.use('/protected/*', async (c) => {
  const token = c.req.headers.authorization?.split(' ')[1];

  if (token) {
    try {
      const decoded = verify(token, jwtSecret) as { sub: number };
      c.set('jwtPayload', decoded); // Attach decoded payload to context
    } catch (err) {
      throw new HTTPException(401, { message: 'Unauthorized' });
    }
  } else {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
});

// Catch Pokemon endpoint (Protected)
app.post('/protected/catch', async (c) => {
  const payload = c.get('jwtPayload');
  if (!payload) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  const body = await c.req.json();
  const { name } = body;

  try {
    let pokemon = await prisma.pokemon.findUnique({ where: { name } });

    if (!pokemon) {
      pokemon = await prisma.pokemon.create({ data: { name } });
    }

    const caughtPokemon = await prisma.caughtPokemon.create({
      data: {
        userId: payload.sub,
        pokemonId: pokemon.id,
      },
    });

    return c.json({ message: 'Pokemon caught', data: caughtPokemon });
  } catch (error) {
    throw new HTTPException(500, { message: 'Internal Server Error' });
  }
});

// Release Pokemon endpoint (Protected)
app.delete('/protected/release/:id', async (c) => {
  const payload = c.get('jwtPayload');
  if (!payload) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  const { id } = c.req.param();

  try {
    await prisma.caughtPokemon.deleteMany({
      where: { id: parseInt(id), userId: payload.sub },
    });

    return c.json({ message: 'Pokemon released' });
  } catch (error) {
    throw new HTTPException(500, { message: 'Internal Server Error' });
  }
});

// Get Caught Pokemon endpoint with pagination (Protected)
app.get('/protected/caught', async (c) => {
  const payload = c.get('jwtPayload');
  if (!payload) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  const { page = 1, perPage = 10 } = c.req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(perPage as string);

  try {
    const caughtPokemon = await prisma.caughtPokemon.findMany({
      where: { userId: payload.sub },
      include: { pokemon: true },
      skip: skip,
      take: parseInt(perPage as string),
    });

    return c.json({ data: caughtPokemon });
  } catch (error) {
    throw new HTTPException(500, { message: 'Internal Server Error' });
  }
});

// Error handler middleware
app.use((err: HTTPException, c) => {
  const status = err.statusCode || 500;
  const message = err.body?.message || 'Internal Server Error';
  return c.json({ message }, status);
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
