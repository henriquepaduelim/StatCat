import styled from "styled-components";

import { useTheme } from "../theme/ThemeProvider";

const ThemeToggleSwitch = () => {
  const { themeId, toggleTheme } = useTheme();
  const isLightTheme = themeId === "light";

  return (
    <StyledWrapper>
      <div className="toggle-switch">
        <label className="switch-label">
          <input
            type="checkbox"
            className="checkbox"
            checked={isLightTheme}
            onChange={toggleTheme}
            aria-label="Toggle between light and dark themes"
          />
          <span className="slider" />
        </label>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 50;
  display: flex;
  justify-content: flex-end;

  .toggle-switch {
    position: relative;
    width: 20px;
    height: 10px;
    --light: #d8dbe0;
    --dark: #28292c;
    --link: rgb(27, 129, 112);
    --link-hover: rgb(24, 94, 82);
  }

  .switch-label {
    position: absolute;
    width: 100%;
    height: 10px;
    background-color: var(--dark);
    border-radius: 5px;
    cursor: pointer;
    border: 1px solid var(--dark);
  }

  .checkbox {
    position: absolute;
    display: none;
  }

  .slider {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 5px;
    transition: 0.3s;
  }

  .checkbox:checked ~ .slider {
    background-color: var(--light);
  }

  .slider::before {
    content: "";
    position: absolute;
    top: 1px;
    left: 1px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    box-shadow: inset 2px -1px 0px 0px var(--light);
    background-color: var(--dark);
    transition: 0.3s;
  }

  .checkbox:checked ~ .slider::before {
    transform: translateX(10px);
    background-color: var(--dark);
    box-shadow: none;
  }

  @media (min-width: 768px) {
    top: 1.5rem;
    right: 1.5rem;
  }
`;

export default ThemeToggleSwitch;
