import { Router } from "express";
import {
    createVariantGroup,
    updateVariantGroup,
    deleteVariantGroup,
    getVariantGroup,
    getAllVariantGroups,
} from "../controllers/variant.controller.js";
import { isAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply auth middleware
router.use(isAdmin);

router.route("/")
    .get(getAllVariantGroups)
    .post(createVariantGroup);

router.route("/:id")
    .get(getVariantGroup)
    .put(updateVariantGroup)
    .delete(deleteVariantGroup);

export default router;
