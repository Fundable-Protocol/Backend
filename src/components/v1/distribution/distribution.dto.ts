import { IsEnum, IsOptional, IsString } from "class-validator";
import { DistributionStatus } from "../../../utils/types/enums";

export class UpdateDistributionDto {
    @IsOptional()
    @IsEnum(DistributionStatus)
    status?: DistributionStatus;

    @IsOptional()
    @IsString()
    transactionHash?: string;
}
