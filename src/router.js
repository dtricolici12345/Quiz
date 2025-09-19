
import { Router } from 'express';
import { auth } from './middlewares/auth.js';
import { validate } from './middlewares/validate.js';

//auth
import { registerSchema, loginSchema } from './modules/auth/auth.validators.js';
import { register, login, refresh, logout, me} from './modules/auth/auth.controller.js';
 


//users
import * as users from './controllers/users.controller.js';
import {
  listUsersSchema,
  userIdParamSchema,
  updateMeSchema,
  changePasswordSchema,
} from './modules/users/users.validators.js';


// questions
import { list as listQuestionsController } from './modules/questions/questions.controller.js';
import { listQuestionsSchema } from './modules/questions/questions.validators.js';

//friends
import { FriendsController } from './modules/friends/friends.controller.js';
import {
  createFriendSchema,
  friendIdParamSchema,
  listFriendsSchema,
  listRequestsSchema,
  requestIdParamSchema,
  friendUserIdParamSchema,
} from './modules/friends/friends.validators.js';


//notifications
import { list as listNotifications, markRead, markAllRead } from './modules/notifications/notifications.controller.js';
import { listNotificationsSchema, notificationIdParamSchema } from './modules/notifications/notifications.validators.js';

//games
import * as GamesController from './modules/games/games.controller.js';
import {
  createGameSchema,
  gameIdParamSchema,
  listGamesSchema,
  submitAnswersSchema
} from './modules/games/games.validators.js';


const router = Router();


// AUTH
router.post('/api/auth/register', validate(registerSchema), register);
router.post('/api/auth/login',    validate(loginSchema),    login);
router.post('/api/auth/refresh',  refresh);
router.post('/api/auth/logout',   logout);
router.get('/api/auth/me', auth, me);

// USERS
router.get   ('/api/users',           validate(listUsersSchema),   users.list);
router.get   ('/api/users/:id',       validate(userIdParamSchema), users.getById);
router.patch ('/api/users/me',        auth, validate(updateMeSchema),      users.updateMe);
router.patch ('/api/users/me/password', auth, validate(changePasswordSchema), users.changePassword);
router.delete('/api/users/me', auth, users.deleteMe);


//QUIESTIONS
router.get('/api/questions', validate(listQuestionsSchema), listQuestionsController);


// FRIENDS (core)
router.post ('/api/friends',                   auth, validate(createFriendSchema),  FriendsController.create);
router.post ('/api/friends/:id/accept',        auth, validate(friendIdParamSchema), FriendsController.accept);
router.post ('/api/friends/:id/decline',       auth, validate(friendIdParamSchema), FriendsController.decline);
router.get  ('/api/friends',                   auth, validate(listFriendsSchema),   FriendsController.list);

// FRIENDS (extras)
router.get   ('/api/friends/requests',         auth, validate(listRequestsSchema), FriendsController.listRequests);
router.delete('/api/friends/requests/:id',     auth, validate(requestIdParamSchema), FriendsController.cancelPending);
router.delete('/api/friends/:userId',          auth, validate(friendUserIdParamSchema), FriendsController.remove);

// FRIENDS (aliases for Postman PATCH variants)
router.patch ('/api/friends/:id/accept',       auth, validate(friendIdParamSchema), FriendsController.accept);
router.patch ('/api/friends/:id/reject',       auth, validate(friendIdParamSchema), FriendsController.decline);

//NOTIFICATIONS
router.get  ('/api/notifications',          auth, validate(listNotificationsSchema), listNotifications);
router.post ('/api/notifications/read-all', auth, markAllRead);
router.post ('/api/notifications/:id/read', auth, validate(notificationIdParamSchema), markRead);

//GAMES
router.post('/api/games',                    auth, GamesController.create);       // A -> B
router.post('/api/games/:id/accept',         auth, GamesController.accept);       // B принимает
router.post('/api/games/:id/decline',        auth, GamesController.decline);      // B отклоняет
router.get ('/api/games',                    auth, GamesController.list);         // мои игры
router.get ('/api/games/:id',                auth, GamesController.getById);      // детально
router.post('/api/games/:id/answers',        auth, GamesController.submitAnswers);// ответы


export default router;
