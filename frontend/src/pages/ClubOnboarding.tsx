import { FormEvent, useState, useEffect } from "react";
import {
  Button,
  Card,
  Select,
  SelectItem,
  TextInput,
} from "@tremor/react";
import { Checkbox } from "../components/Checkbox";
import { useAuthStore } from "../stores/useAuthStore";

const ClubOnboarding = () => {
  const { user } = useAuthStore();

  const [clubName, setClubName] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [numAthletes, setNumAthletes] = useState("");
  const [sport, setSport] = useState("");
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isSameAsCreator, setIsSameAsCreator] = useState(true);
  const [contactName, setContactName] = useState(user?.full_name ?? "");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");

  useEffect(() => {
    if (isSameAsCreator) {
      setContactName(user?.full_name ?? "");
      setContactEmail(user?.email ?? "");
    } else {
      setContactName("");
      setContactEmail("");
    }
  }, [isSameAsCreator, user]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setLogo(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = {
      clubName,
      logo,
      numAthletes,
      sport,
      website,
      contactName,
      contactEmail,
    };

    console.log("Submitting club onboarding data:", formData);

    // TODO: Send data to the backend
    // try {
    //   await api.post("/onboarding/club", formData);
    //   navigate("/dashboard");
    // } catch (error) {
    //   console.error("Failed to submit onboarding data", error);
    // } finally {
    //   setIsSubmitting(false);
    // }

    // For now, just log and simulate submission
    setTimeout(() => {
      setIsSubmitting(false);
      alert("Onboarding data submitted (check console)!");
    }, 1000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold text-tremor-content-strong">
          Welcome! Let&apos;s set up your club.
        </h1>
        <p className="mt-2 text-tremor-content">
          Please provide some details about your organization.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="club-name"
                className="text-sm font-medium text-tremor-content-strong"
              >
                Club Name
              </label>
              <TextInput
                id="club-name"
                name="club-name"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="e.g., Elite Football Academy"
                className="mt-2"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="logo"
                className="text-sm font-medium text-tremor-content-strong"
              >
                Club Logo
              </label>
              <input
                id="logo"
                name="logo"
                type="file"
                onChange={handleFileChange}
                className="mt-2 block w-full text-sm text-tremor-content file:mr-4 file:rounded-md file:border-0 file:bg-tremor-brand-faint file:py-2 file:px-4 file:text-sm file:font-semibold file:text-tremor-brand-emphasis hover:file:bg-tremor-brand-muted"
              />
            </div>

            <div>
              <label
                htmlFor="num-athletes"
                className="text-sm font-medium text-tremor-content-strong"
              >
                Number of Athletes
              </label>
              <Select
                id="num-athletes"
                value={numAthletes}
                onValueChange={setNumAthletes}
                className="mt-2"
                required
              >
                <SelectItem value="-10">Up to 10</SelectItem>
                <SelectItem value="10-30">10 - 30</SelectItem>
                <SelectItem value="30-50">30 - 50</SelectItem>
                <SelectItem value="50+">50+</SelectItem>
              </Select>
            </div>

            <div>
              <label
                htmlFor="sport"
                className="text-sm font-medium text-tremor-content-strong"
              >
                Main Sport
              </label>
              <TextInput
                id="sport"
                name="sport"
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                placeholder="e.g., Football"
                className="mt-2"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="website"
                className="text-sm font-medium text-tremor-content-strong"
              >
                Club Website
              </label>
              <TextInput
                id="website"
                name="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="mt-2"
              />
            </div>
          </div>

          <div className="mt-6 border-t border-tremor-border pt-6">
            <h2 className="text-lg font-semibold text-tremor-content-strong">
              Administrative Contact
            </h2>
            <div className="mt-4">
              <Checkbox
                id="same-as-creator"
                checked={isSameAsCreator}
                onCheckedChange={(checked) => setIsSameAsCreator(checked === true)}
              />
              <label
                htmlFor="same-as-creator"
                className="ml-2 text-sm text-tremor-content"
              >
                I am the main administrative contact for this club.
              </label>
            </div>

            {!isSameAsCreator && (
              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="text-sm font-medium text-tremor-content-strong"
                  >
                    Contact Full Name
                  </label>
                  <TextInput
                    id="contact-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="mt-2"
                    required={!isSameAsCreator}
                  />
                </div>
                <div>
                  <label
                    htmlFor="contact-email"
                    className="text-sm font-medium text-tremor-content-strong"
                  >
                    Contact Email
                  </label>
                  <TextInput
                    id="contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="mt-2"
                    required={!isSameAsCreator}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end">
            <Button type="submit" loading={isSubmitting}>
              Save and Continue
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ClubOnboarding;
