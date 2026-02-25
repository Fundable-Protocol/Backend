import { NextFunction, Response } from "express";
import { CampaignService } from "./campaign.service";
import { IRequest } from "../../../types/global";

const campaignService = new CampaignService();

export const updateCampaign = async (req: IRequest, res: Response, next: NextFunction) => {
    try {
        const { campaign_id } = req.params;
        const userAddress = req.decoded?.address;

        if (!userAddress) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User address not found in token"
            });
        }

        const updatedCampaign = await campaignService.updateCampaign(campaign_id, req.body, userAddress);

        return res.status(200).json({
            success: true,
            message: "Campaign updated successfully",
            data: updatedCampaign
        });
    } catch (error) {
        next(error);
    }
};
