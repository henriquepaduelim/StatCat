import { FormEvent, useState } from "react";
import {
  Button,
  Card,
  DateRangePicker,
  Select,
  SelectItem,
  TextInput,
} from "@tremor/react";

const AthleteOnboarding = () => {
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>();
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [dominantFoot, setDominantFoot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = {
      dateOfBirth,
      gender,
      height,
      weight,
      dominantFoot,
    };

    console.log("Submitting athlete onboarding data:", formData);

    // TODO: Send data to the backend
    // try {
    //   await api.post("/onboarding/athlete", formData);
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
          Complete Your Athlete Profile
        </h1>
        <p className="mt-2 text-tremor-content">
          Please provide some more details about yourself.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="dob"
                className="text-sm font-medium text-tremor-content-strong"
              >
                Date of Birth
              </label>
              <DateRangePicker
                id="dob"
                value={dateOfBirth ? { from: dateOfBirth, to: dateOfBirth } : undefined}
                onValueChange={(value) => setDateOfBirth(value.from)}
                className="mt-2"
                enableYearNavigation
              />
            </div>

            <div>
              <label
                htmlFor="gender"
                className="text-sm font-medium text-tremor-content-strong"
              >
                Gender
              </label>
              <Select
                id="gender"
                value={gender}
                onValueChange={setGender}
                className="mt-2"
                required
              >
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">
                  Prefer not to say
                </SelectItem>
              </Select>
            </div>

            <div>
              <label
                htmlFor="height"
                className="text-sm font-medium text-tremor-content-strong"
              >
                Height (cm)
              </label>
              <TextInput
                id="height"
                name="height"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="e.g., 180"
                className="mt-2"
                required
              />
            </div>

            <div>
              <label
                htmlFor="weight"
                className="text-sm font-medium text-tremor-content-strong"
              >
                Weight (kg)
              </label>
              <TextInput
                id="weight"
                name="weight"
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g., 75"
                className="mt-2"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="dominant-foot"
                className="text-sm font-medium text-tremor-content-strong"
              >
                Dominant Foot
              </label>
              <Select
                id="dominant-foot"
                value={dominantFoot}
                onValueChange={setDominantFoot}
                className="mt-2"
              >
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </Select>
            </div>
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

export default AthleteOnboarding;
