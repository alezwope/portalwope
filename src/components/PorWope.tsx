import Image from "next/image";

/** «by [logo] WOPE Calistenia»: el isotipo va del mismo tamaño que la letra. */
export default function PorWope({ texto }: { texto: string }) {
  const [antes, despues] = texto.split(/WOPE Calistenia/i);
  return (
    <>
      {antes}
      <Image src="/brand/wope-isotipo.png" alt="" width={96} height={96} className="inline-block h-[1.1em] w-[1.1em] align-[-0.2em]" />
      {" "}WOPE Calistenia{despues}
    </>
  );
}
