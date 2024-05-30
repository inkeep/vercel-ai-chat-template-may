import { Link1Icon } from "@radix-ui/react-icons";
import { Card } from "./ui/card";
import { DeepPartial } from "ai";
import { z } from "zod";
import { SourcesSchema } from "@/lib/chat/StepSchema";

export function Sources({ sources }:  { sources: DeepPartial<z.infer<typeof SourcesSchema>>}) {
  return (
    <div className="flex flex-col gap-6">
      {sources?.map((source, index) => (
        <Card key={index} className="p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 dark:border-gray-700">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-medium">{source?.title || "Default Title"}</h3>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:underline">
              {source?.url}
              <Link1Icon className="ml-1 w-4 h-4" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}