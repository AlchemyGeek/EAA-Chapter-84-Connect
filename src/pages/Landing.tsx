import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import chapterLogo from "@/assets/chapter-logo.jpg";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <img
          src={chapterLogo}
          alt="EAA Chapter 84 logo"
          className="mx-auto h-28 w-28 rounded-xl object-contain"
        />

        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Chapter 84 Connect
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Chapter 84 Connect is the member services portal for EAA Chapter 84.
            Here you can manage your membership, join programs, volunteer, and
            stay connected with the chapter community.
          </p>
        </div>

        <Button asChild size="lg" className="w-full min-h-[44px] text-base">
          <Link to="/auth">Sign In</Link>
        </Button>
      </div>
    </div>
  );
}
