import { z } from "zod";

const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;

export const updateCampaignSchema = z.object({
    target_amount: z.string().optional().refine(val => !val || /^\d+(\.\d+)?$/.test(val), {
        message: "target_amount must be a valid decimal string"
    }),
    description: z.string().optional(),
    end_date: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), {
        message: "end_date must be a valid date string"
    }),
    tags: z.array(z.string()).max(10, "Tags cannot exceed 10").optional(),
    social_links: z.record(z.string().regex(urlRegex, "Invalid social link URL")).optional(),
    image_url: z.string().regex(urlRegex, "Invalid image URL").optional(),
    title: z.string().optional(),
});

export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
