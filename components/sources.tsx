import { Link1Icon } from "@radix-ui/react-icons";
import { Card } from "./ui/card";
import { DeepPartial } from "ai";
import { z } from "zod";
import { RecordsCitedSchema } from "@/lib/chat/inkeepMessageSchema";

export function Sources({ sources }: { sources: DeepPartial<z.infer<typeof RecordsCitedSchema>> }) {
  return (
    <div className="flex flex-col gap-6">
      {sources?.citations?.map((citation, index) => (
        <a
          key={index}
          href={citation?.record?.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Card className="p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 dark:border-gray-700">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-medium">{citation?.record?.title || "Default Title"}</h3>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:underline">
                {citation?.record?.url}
                <Link1Icon className="ml-1 size-4" />
              </div>
            </div>
          </Card>
        </a>
      ))}
    </div>
  );
}