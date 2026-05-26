import { Router } from 'express';
import wardrobeRouter from './wardrobe.js';
import outfitsRouter from './outfits.js';
import accessoriesRouter from './accessories.js';
import usersRouter from './users.js';
import photosRouter from './photos.js';
import insightsRouter from './insights.js';
import chatRouter from './chat.js';
import recommendationsRouter from './recommendations.js';

const router = Router();

// Register all route modules
router.use(wardrobeRouter);
router.use(outfitsRouter);
router.use(accessoriesRouter);
router.use(usersRouter);
router.use(photosRouter);
router.use(insightsRouter);
router.use(chatRouter);
router.use(recommendationsRouter);

export default router;
