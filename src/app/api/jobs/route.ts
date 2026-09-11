import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { title, description, criteria } = (await req.json()) as {
      title: string;
      description: string;
      criteria: string[];
    };

    if (!title || !criteria || criteria.length === 0) {
      return NextResponse.json(
        { error: "Le titre et au moins un critère sont requis." },
        { status: 400 }
      );
    }

    const job = await prisma.job.create({
      data: {
        title,
        description: description ?? "",
        criteria: {
          create: criteria
            .filter((c) => c.trim().length > 0)
            .map((label) => ({ label: label.trim() })),
        },
      },
    });

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    console.error("Erreur création poste :", error);
    return NextResponse.json({ error: "Erreur serveur lors de la création du poste." }, { status: 500 });
  }
}