/** @file Status avatar shared by goal cards and archived rows: one icon and tint per GoalStatus. */

import { Avatar } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import type { GoalStatus } from "../../lib/goals";

const STATUS_STYLE: Record<
  GoalStatus,
  { Icon: SvgIconComponent; bgcolor: string; color: string }
> = {
  active: {
    Icon: SavingsOutlinedIcon,
    bgcolor: "primary.light",
    color: "primary.dark",
  },
  completed: {
    Icon: TaskAltOutlinedIcon,
    bgcolor: "success.light",
    color: "success.dark",
  },
  archived: {
    Icon: ArchiveOutlinedIcon,
    bgcolor: "action.disabledBackground",
    color: "text.disabled",
  },
};

export function GoalStatusAvatar({ status }: { status: GoalStatus }) {
  const { Icon, bgcolor, color } = STATUS_STYLE[status];
  return (
    <Avatar sx={{ bgcolor, color }}>
      <Icon fontSize="small" />
    </Avatar>
  );
}
