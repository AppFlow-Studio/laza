"use client"
import React, {JSX, useRef, useEffect } from "react"
import Image from "next/image"
import JamalLawMeeting from '@/public/JamalLawMeeting.jpeg'
import { motion, useInView, useAnimation } from 'motion/react'
interface SlidingDivProps {
    className : string
    position: "left" | "right"
    children : React.ReactNode
}
export default function SlidingDiv({ position, className, children }: SlidingDivProps) {
    const ref = useRef(null)
    const isInView = useInView(ref, { once : true })

    const mainControls = useAnimation()

    useEffect(() => {
    if( isInView ){
        // Fire Animation
        mainControls.start('visible')
    }
    }, [isInView])
    return (
      <div className={className}
      ref={ref}
      >
        {/* Content container */}
        <motion.div
          className="w-full"
          variants={{
                hidden : { opacity : 0, x : position == 'left' ? -150 : 150 },
                visible : { opacity : 1, x : 0}
            }}
           initial='hidden'
           animate={mainControls}
           transition={{ duration : 0.5, delay : 0.25}}
        >
          {children}
        </motion.div>
      </div>
    )
  }