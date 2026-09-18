import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import FlightTakeoffOutlinedIcon from "@mui/icons-material/FlightTakeoffOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import LaptopMacOutlinedIcon from "@mui/icons-material/LaptopMacOutlined";
import DownhillSkiingOutlinedIcon from "@mui/icons-material/DownhillSkiingOutlined";
import type { GoalIcon } from "../../lib/goals";

// Central place to add a new goal icon; every card/row reads from here.
export const goalIconMap: Record<GoalIcon, React.ElementType> = {
  emergency: SecurityOutlinedIcon,
  house: HomeOutlinedIcon,
  vacation: FlightTakeoffOutlinedIcon,
  loan: SchoolOutlinedIcon,
  laptop: LaptopMacOutlinedIcon,
  sport: DownhillSkiingOutlinedIcon,
};
