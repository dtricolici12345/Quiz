
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
import { createFriendSchema, friendIdParamSchema } from './modules/friends/friends.validators.js';


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

// FRIENDS
router.post('/api/friends',             auth, validate(createFriendSchema),  FriendsController.create);
router.post('/api/friends/:id/accept',  auth, validate(friendIdParamSchema), FriendsController.accept);
router.post('/api/friends/:id/decline', auth, validate(friendIdParamSchema), FriendsController.decline);
router.get ('/api/friends',             auth, validate(listFriendsSchema),   FriendsController.list); 

export default router;
