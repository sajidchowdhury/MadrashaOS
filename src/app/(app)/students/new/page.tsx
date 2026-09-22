"use client";

/**
 * MadrashaOS — Add Student page (Session 10.4 fix)
 *
 * Route: /students/new
 *
 * Form for creating a new student. Calls POST /api/v1/students.
 * Requires: students.create permission.
 *
 * Fields (per createStudentSchema):
 *   - name (required), name_bn (required), name_ar (optional)
 *   - class_id (required, from useClasses), section_id (optional, derived)
 *   - guardian_id (required, from useGuardians), guardian_relation (optional)
 *   - roll (required, number), gender (required: male/female)
 *   - dob (required, date), blood_group (optional)
 *   - present_address (optional), permanent_address (optional)
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied } from "@/components/states";
import { useToast } from "@/hooks/use-toast";
import { useClasses, useGuardians } from "@/lib/query/client";

export default function AddStudentPage() {
  return (
    <IfPermission code="students.create" fallback={<PermissionDenied />}>
      <AddStudentContent />
    </IfPermission>
  );
}

function AddStudentContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: classes } = useClasses();
  const { data: guardians } = useGuardians();

  const [submitting, setSubmitting] = React.useState(false);
  const [name, setName] = React.useState("");
  const [nameBn, setNameBn] = React.useState("");
  const [nameAr, setNameAr] = React.useState("");
  const [classId, setClassId] = React.useState("");
  const [sectionId, setSectionId] = React.useState("");
  const [guardianId, setGuardianId] = React.useState("");
  const [guardianRelation, setGuardianRelation] = React.useState("father");
  const [roll, setRoll] = React.useState(1);
  const [gender, setGender] = React.useState<"male" | "female">("male");
  const [dob, setDob] = React.useState("");
  const [bloodGroup, setBloodGroup] = React.useState("");
  const [presentAddress, setPresentAddress] = React.useState("");

  // Derive sections from selected class
  const selectedClass = classes?.find((c) => c.id === classId) as
    | { sectionsWithIds?: Array<{ id: string; name: string }> }
    | undefined;
  const sections = selectedClass?.sectionsWithIds ?? [];

  const canSubmit =
    name.trim() &&
    nameBn.trim() &&
    classId &&
    guardianId &&
    roll > 0 &&
    dob;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          name_bn: nameBn.trim(),
          name_ar: nameAr.trim() || undefined,
          class_id: classId,
          section_id: sectionId || undefined,
          guardian_id: guardianId,
          guardian_relation: guardianRelation || undefined,
          roll,
          gender,
          dob: dob,
          blood_group: bloodGroup || undefined,
          present_address: presentAddress || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast({
          title: "Failed to create student",
          description: data?.error || data?.details?.formErrors?.[0] || `Server returned ${res.status}.`,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      toast({
        title: "Student created",
        description: `${data.code || "New student"} — ${name}`,
      });

      // Navigate to the new student's profile
      if (data.id) {
        router.push(`/students/${data.id}`);
      } else {
        router.push("/students");
      }
    } catch {
      toast({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        {/* Header */}
        <header className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to students list"
            onClick={() => router.push("/students")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-caption text-text-muted">Students</p>
            <h1 className="text-subtitle font-semibold text-text-primary">
              Add New Student
            </h1>
          </div>
        </header>

        <Card className="border-border-default shadow-elevation-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-subtitle">
              <UserPlus className="h-5 w-5 text-primary-500" />
              Student Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name section */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name (English) <span className="text-semantic-danger">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ahmad Hossain"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name-bn">
                  Full Name (Bangla) <span className="text-semantic-danger">*</span>
                </Label>
                <Input
                  id="name-bn"
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  placeholder="আহমদ হোসাইন"
                  lang="bn"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name-ar">Full Name (Arabic)</Label>
                <Input
                  id="name-ar"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="أحمد حسين"
                  lang="ar"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Class + Section + Guardian */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Class <span className="text-semantic-danger">*</span>
                </Label>
                <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(""); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select
                  value={sectionId}
                  onValueChange={setSectionId}
                  disabled={sections.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={sections.length === 0 ? "No sections" : "Select section"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        Section {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  Guardian <span className="text-semantic-danger">*</span>
                </Label>
                <Select value={guardianId} onValueChange={setGuardianId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select guardian" />
                  </SelectTrigger>
                  <SelectContent>
                    {guardians?.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="relation">Guardian Relation</Label>
                <Select value={guardianRelation} onValueChange={setGuardianRelation}>
                  <SelectTrigger className="w-full" id="relation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="mother">Mother</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="uncle">Uncle</SelectItem>
                    <SelectItem value="aunt">Aunt</SelectItem>
                    <SelectItem value="grandfather">Grandfather</SelectItem>
                    <SelectItem value="grandmother">Grandmother</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Roll + Gender + DOB */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="roll">
                  Roll Number <span className="text-semantic-danger">*</span>
                </Label>
                <Input
                  id="roll"
                  type="number"
                  min={1}
                  value={roll}
                  onChange={(e) => setRoll(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Gender <span className="text-semantic-danger">*</span>
                </Label>
                <RadioGroup
                  value={gender}
                  onValueChange={(v) => setGender(v as "male" | "female")}
                  className="flex gap-4"
                >
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="male" />
                    Male
                  </Label>
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="female" />
                    Female
                  </Label>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">
                  Date of Birth <span className="text-semantic-danger">*</span>
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
            </div>

            {/* Blood group + Address */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="blood-group">Blood Group</Label>
                <Select value={bloodGroup} onValueChange={setBloodGroup}>
                  <SelectTrigger className="w-full" id="blood-group">
                    <SelectValue placeholder="Select (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Present Address</Label>
                <Input
                  id="address"
                  value={presentAddress}
                  onChange={(e) => setPresentAddress(e.target.value)}
                  placeholder="House, Road, Area"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.push("/students")}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            <Save className="h-4 w-4" />
            {submitting ? "Creating…" : "Create Student"}
          </Button>
        </div>
      </div>
    </div>
  );
}
