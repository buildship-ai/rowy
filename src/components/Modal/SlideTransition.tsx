import { forwardRef, cloneElement } from "react";
import { useTheme } from "@mui/material";
import { Transition } from "react-transition-group";
import { TransitionProps } from "react-transition-group/Transition";
import { TransitionProps as MuiTransitionProps } from "@mui/material/transitions";

export const SlideTransition: React.ForwardRefExoticComponent<
  Pick<TransitionProps, React.ReactText> & React.RefAttributes<any>
> = forwardRef(
  ({ children, timeout, ...props }: TransitionProps, ref: React.Ref<any>) => {
    const theme = useTheme();

    if (!children) return null;

    const defaultStyle = {
      opacity: 0,
      transform: "translateY(40px)",

      transition: theme.transitions.create(["transform", "opacity"], {
        duration: "300ms",
        easing: "cubic-bezier(0.1, 0.8, 0.1, 1)",
      }),
    };

    const transitionStyles = {
      entering: {
        willChange: "transform, opacity",
      },

      entered: {
        opacity: 1,
        transform: "none",
      },

      exiting: {
        opacity: 0,
        transform: "none",

        transition: theme.transitions.create(["opacity"], {
          duration: theme.transitions.duration.leavingScreen,
        }),
      },

      exited: {
        opacity: 0,
        transform: "none",
        transition: "none",
      },

      unmounted: {},
    };

    const resolvedTimeout =
      typeof timeout === "number"
        ? { enter: timeout, exit: theme.transitions.duration.leavingScreen }
        : {
            enter: timeout?.enter ?? 0,
            exit: timeout?.exit ?? theme.transitions.duration.leavingScreen,
          };

    return (
      <Transition
        appear
        timeout={resolvedTimeout}
        {...props}
      >
        {(state) =>
          cloneElement(children as any, {
            style: { ...defaultStyle, ...transitionStyles[state] },
            tabIndex: -1,
            ref,
          })
        }
      </Transition>
    );
  }
);

export default SlideTransition;

export const SlideTransitionMui = forwardRef(function Transition(
  props: MuiTransitionProps & { children?: React.ReactElement<any, any> },
  ref: React.Ref<unknown>
) {
  return <SlideTransition ref={ref} {...props} />;
});
